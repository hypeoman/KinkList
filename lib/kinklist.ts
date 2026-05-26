export type KinkItem = {
  id: string;
  title: string;
  hint?: string;
};

export type KinkSection = {
  id: string;
  title: string;
  columns: string[];
  items: KinkItem[];
};

export type ChoiceOption = {
  id: string;
  label: string;
  color: string;
  textColor: string;
};

export type ParsedConfig = {
  sections: KinkSection[];
  options: ChoiceOption[];
};

const DEFAULT_EMPTY_COLUMNS = [""];

export const DEFAULT_OPTIONS: ChoiceOption[] = [
  { id: "not-entered", label: "not entered", color: "#ffffff", textColor: "#483030" },
  { id: "favorite", label: "favorite", color: "#f6abc8", textColor: "#4a1327" },
  { id: "like", label: "like", color: "#99d876", textColor: "#203e13" },
  { id: "okay", label: "okay", color: "#f3db67", textColor: "#534100" },
  { id: "maybe", label: "maybe", color: "#f2ab57", textColor: "#5a3408" },
  { id: "no", label: "no", color: "#ea7566", textColor: "#57120a" }
];

const optionLinePrefix = "!options:";

function slugify(value: string, fallback: string): string {
  const prepared = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  return prepared || fallback;
}

function computeTextColor(background: string): string {
  const normalized = background.replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return "#2c1a1a";
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 155 ? "#2c1a1a" : "#fffaf6";
}

function parseColumns(source: string): string[] | null {
  const trimmed = source.trim();
  if (!trimmed.startsWith("(") || !trimmed.endsWith(")")) {
    return null;
  }

  const rawColumns = trimmed
    .slice(1, -1)
    .split(",")
    .map((column) => column.trim());

  if (rawColumns.length === 1 && rawColumns[0] === "") {
    return DEFAULT_EMPTY_COLUMNS;
  }

  return rawColumns;
}

function parseOptionsLine(line: string): ChoiceOption[] {
  const rawOptions = line.slice(optionLinePrefix.length).trim();
  if (!rawOptions) {
    return DEFAULT_OPTIONS;
  }

  const parsed = rawOptions
    .split(";")
    .map((entry, index) => {
      const [idPart, labelPart, colorPart] = entry.split("|").map((part) => part.trim());
      const label = labelPart || idPart;
      const id = slugify(idPart || label || `option-${index + 1}`, `option-${index + 1}`);
      const color = /^#[0-9a-f]{6}$/i.test(colorPart ?? "") ? (colorPart as string) : "#ffffff";

      return {
        id,
        label: label || `Option ${index + 1}`,
        color,
        textColor: computeTextColor(color)
      };
    })
    .filter((option) => option.label);

  return parsed.length > 0 ? parsed : DEFAULT_OPTIONS;
}

export function parseConfig(
  configText: string,
  labels?: {
    anonymousSection?: string;
    untitledSection?: string;
    untitledItem?: string;
  }
): ParsedConfig {
  const anonymousSection = labels?.anonymousSection ?? "Без раздела";
  const untitledSection = labels?.untitledSection ?? "Раздел";
  const untitledItem = labels?.untitledItem ?? "Пункт";
  const lines = configText.split(/\r?\n/).map((line) => line.trim());
  const sections: KinkSection[] = [];
  let options = DEFAULT_OPTIONS;
  let currentSection: KinkSection | null = null;
  let pendingColumns: string[] = [...DEFAULT_EMPTY_COLUMNS];

  lines.forEach((line, sectionIndex) => {
    if (!line) {
      return;
    }

    if (line.startsWith(optionLinePrefix)) {
      options = parseOptionsLine(line);
      return;
    }

    if (line.startsWith("#")) {
      currentSection = {
        id: slugify(line.slice(1), `section-${sections.length + 1}`),
        title: line.slice(1).trim() || `${untitledSection} ${sections.length + 1}`,
        columns: pendingColumns,
        items: []
      };
      pendingColumns = [...DEFAULT_EMPTY_COLUMNS];
      sections.push(currentSection);
      return;
    }

    const parsedColumns = parseColumns(line);
    if (parsedColumns !== null) {
      if (currentSection && currentSection.items.length === 0) {
        currentSection.columns = parsedColumns;
      } else {
        pendingColumns = parsedColumns;
      }
      return;
    }

    if (line.startsWith("*")) {
      if (!currentSection) {
        currentSection = {
          id: `section-${sectionIndex + 1}`,
          title: anonymousSection,
          columns: pendingColumns,
          items: []
        };
        pendingColumns = [...DEFAULT_EMPTY_COLUMNS];
        sections.push(currentSection);
      }

      const [rawTitle, rawHint] = line.slice(1).split(":::").map((part) => part.trim());
      const title = rawTitle || `${untitledItem} ${currentSection.items.length + 1}`;
      currentSection.items.push({
        id: `${currentSection.id}-${slugify(title, `item-${currentSection.items.length + 1}`)}`,
        title,
        hint: rawHint || undefined
      });
    }
  });

  return {
    sections,
    options
  };
}

export type AnswersState = Record<string, string>;

export function createAnswerKey(sectionId: string, itemId: string, columnIndex: number): string {
  return `${sectionId}__${itemId}__${columnIndex}`;
}

function encodeUtf8(input: string): string {
  if (typeof window === "undefined") {
    return Buffer.from(input, "utf8").toString("base64url");
  }

  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeUtf8(input: string): string {
  if (typeof window === "undefined") {
    return Buffer.from(input, "base64url").toString("utf8");
  }

  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function serializePayload<T>(payload: T): string {
  return encodeUtf8(JSON.stringify(payload));
}

export function deserializePayload<T>(serialized: string | null): T | null {
  if (!serialized) {
    return null;
  }

  try {
    return JSON.parse(decodeUtf8(serialized)) as T;
  } catch {
    return null;
  }
}

export function serializeAnswersPayload(
  answers: AnswersState,
  sections: KinkSection[],
  options: ChoiceOption[]
): string {
  const optionIndexById = new Map(
    options.map((option, index) => [option.id, index.toString(36)])
  );
  const entries: string[] = [];
  let cellIndex = 0;

  sections.forEach((section) => {
    section.items.forEach((item) => {
      section.columns.forEach((_, columnIndex) => {
        const key = createAnswerKey(section.id, item.id, columnIndex);
        const value = answers[key];
        const optionIndex = value ? optionIndexById.get(value) : null;

        if (optionIndex && value !== "not-entered") {
          entries.push(`${cellIndex.toString(36)}.${optionIndex}`);
        }

        cellIndex += 1;
      });
    });
  });

  return `v1:${entries.join("-")}`;
}

export function deserializeAnswersPayload(
  serialized: string | null,
  sections: KinkSection[],
  options: ChoiceOption[]
): AnswersState | null {
  if (!serialized) {
    return null;
  }

  if (!serialized.startsWith("v1:")) {
    return deserializePayload<AnswersState>(serialized);
  }

  const encodedEntries = serialized.slice(3);
  if (!encodedEntries) {
    return {};
  }

  const cells: string[] = [];
  sections.forEach((section) => {
    section.items.forEach((item) => {
      section.columns.forEach((_, columnIndex) => {
        cells.push(createAnswerKey(section.id, item.id, columnIndex));
      });
    });
  });

  const resolvedAnswers: AnswersState = {};

  try {
    encodedEntries.split("-").forEach((entry) => {
      const [cellPart, optionPart] = entry.split(".");
      const cellIndex = Number.parseInt(cellPart, 36);
      const optionIndex = Number.parseInt(optionPart, 36);
      const cellKey = cells[cellIndex];
      const option = options[optionIndex];

      if (!cellKey || !option || option.id === "not-entered") {
        return;
      }

      resolvedAnswers[cellKey] = option.id;
    });

    return resolvedAnswers;
  } catch {
    return null;
  }
}

export function createSummaryText(
  sections: KinkSection[],
  answers: AnswersState,
  options: ChoiceOption[]
): string {
  const optionMap = new Map(options.map((option) => [option.id, option.label]));

  return sections
    .map((section) => {
      const itemsText = section.items
        .map((item) => {
          const hintText = item.hint ? ` - ${item.hint}` : "";
          if (section.columns.length === 0) {
            return `- ${item.title}${hintText}`;
          }

          const answersText = section.columns
            .map((column, columnIndex) => {
              const key = createAnswerKey(section.id, item.id, columnIndex);
              const selected = answers[key] ?? "not-entered";
              const columnLabel = column || `#${columnIndex + 1}`;
              return `${columnLabel}: ${optionMap.get(selected) ?? selected}`;
            })
            .join(" | ");

          return `- ${item.title}${hintText}\n  ${answersText}`;
        })
        .join("\n");

      return `${section.title}\n${itemsText}`;
    })
    .join("\n\n");
}
