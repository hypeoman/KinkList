"use client";

import { toPng } from "html-to-image";
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import styles from "./page.module.css";
import { type Locale, localeMessages, localeOptions, type Theme } from "@/lib/i18n";
import {
  DEFAULT_OPTIONS,
  type AnswersState,
  type KinkItem,
  type KinkSection,
  createAnswerKey,
  createSummaryText,
  deserializePayload,
  parseConfig,
  serializePayload
} from "@/lib/kinklist";

type SharedState = {
  config?: string;
  answers?: AnswersState;
  locale?: Locale;
  theme?: Theme;
};

type FilterMode = "all" | "answered" | "unanswered";

type ExportSection = {
  id: string;
  title: string;
  columns: string[];
  items: Array<{
    id: string;
    title: string;
    hint?: string;
    answers: Array<{
      column: string;
      optionId: string;
    }>;
  }>;
};

function downloadFile(filename: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function buildShareUrl(sharedState: SharedState) {
  const url = new URL(window.location.href);
  const params = new URLSearchParams();

  if (sharedState.config) {
    params.set("config", serializePayload(sharedState.config));
  }

  if (sharedState.answers && Object.keys(sharedState.answers).length > 0) {
    params.set("answers", serializePayload(sharedState.answers));
  }

  if (sharedState.locale && sharedState.locale !== "ru") {
    params.set("locale", serializePayload(sharedState.locale));
  }

  if (sharedState.theme && sharedState.theme !== "light") {
    params.set("theme", serializePayload(sharedState.theme));
  }

  url.search = params.toString();
  return url.toString();
}

export default function HomePage() {
  const englishDefaults = localeMessages.en;
  const [locale, setLocale] = useState<Locale>("ru");
  const [theme, setTheme] = useState<Theme>("light");
  const [rawConfig, setRawConfig] = useState(englishDefaults.defaultConfig);
  const [defaultConfig, setDefaultConfig] = useState(englishDefaults.defaultConfig);
  const [configDraft, setConfigDraft] = useState(englishDefaults.defaultConfig);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [statusMessage, setStatusMessage] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const exportRef = useRef<HTMLDivElement>(null);
  const exportCardRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const previousDefaultConfigRef = useRef(englishDefaults.defaultConfig);
  const [exportName, setExportName] = useState("");

  useEffect(() => {
    let isCancelled = false;
    const url = new URL(window.location.href);
    const sharedConfig = deserializePayload<string>(url.searchParams.get("config"));
    const sharedAnswers = deserializePayload<AnswersState>(url.searchParams.get("answers"));
    const sharedLocale = deserializePayload<Locale>(url.searchParams.get("locale"));
    const sharedTheme = deserializePayload<Theme>(url.searchParams.get("theme"));
    const resolvedLocale = sharedLocale === "en" ? "en" : "ru";
    const localeDefaults = localeMessages[resolvedLocale] ?? englishDefaults;
    const resolvedDefaultConfig = localeDefaults.defaultConfig || englishDefaults.defaultConfig;

    if (!isCancelled) {
      previousDefaultConfigRef.current = resolvedDefaultConfig;
      setLocale(resolvedLocale);
      setTheme(sharedTheme === "dark" ? "dark" : "light");
      setDefaultConfig(resolvedDefaultConfig);
      setRawConfig(sharedConfig ?? resolvedDefaultConfig);
      setConfigDraft(sharedConfig ?? resolvedDefaultConfig);
      setAnswers(sharedAnswers ?? {});
      initializedRef.current = true;
    }

    return () => {
      isCancelled = true;
    };
  }, []);

  const t = localeMessages[locale];
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    const nextLocaleDefaults = localeMessages[locale] ?? englishDefaults;
    const nextDefaultConfig = nextLocaleDefaults.defaultConfig || englishDefaults.defaultConfig;
    const previousDefaultConfig = previousDefaultConfigRef.current;
    const shouldReplaceRawConfig = rawConfig === previousDefaultConfig;
    const shouldReplaceDraft = configDraft === previousDefaultConfig;

    previousDefaultConfigRef.current = nextDefaultConfig;
    setDefaultConfig(nextDefaultConfig);

    if (shouldReplaceRawConfig) {
      setRawConfig(nextDefaultConfig);
    }

    if (shouldReplaceDraft) {
      setConfigDraft(nextDefaultConfig);
    }
  }, [configDraft, englishDefaults.defaultConfig, locale, rawConfig]);

  useEffect(() => {
    document.documentElement.style.setProperty("--bg", theme === "dark" ? "linear-gradient(180deg, #1e161b 0%, #251a22 45%, #141015 100%)" : "linear-gradient(180deg, #f7ecf2 0%, #f6f1e9 45%, #fff9f5 100%)");
    document.documentElement.style.setProperty("--text", theme === "dark" ? "#f7e8e1" : "#2c1a1a");
  }, [theme]);

  const parsedConfig = useMemo(
    () =>
      parseConfig(rawConfig, {
        anonymousSection: t.anonymousSection,
        untitledSection: t.untitledSection,
        untitledItem: t.untitledItem
      }),
    [rawConfig, t]
  );
  const options = parsedConfig.options.length > 0 ? parsedConfig.options : DEFAULT_OPTIONS;

  function itemHasAnsweredValue(section: KinkSection, item: KinkItem) {
    return section.columns.some((_, columnIndex) => {
      const cellKey = createAnswerKey(section.id, item.id, columnIndex);
      const value = answers[cellKey] ?? "not-entered";
      return value !== "not-entered";
    });
  }

  const filteredSections = useMemo(() => {
    return parsedConfig.sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const haystack = `${item.title} ${item.hint ?? ""}`.toLowerCase();
          const matchesSearch = !deferredSearch || haystack.includes(deferredSearch);
          const hasAnsweredValue = itemHasAnsweredValue(section, item);

          if (!matchesSearch) {
            return false;
          }

          if (filterMode === "answered") {
            return hasAnsweredValue;
          }

          if (filterMode === "unanswered") {
            return !hasAnsweredValue;
          }

          return true;
        })
      }))
      .filter((section) => section.items.length > 0);
  }, [answers, deferredSearch, filterMode, parsedConfig.sections]);

  const exportSections = useMemo<ExportSection[]>(() => {
    const sections = parsedConfig.sections
      .map((section) => ({
        id: section.id,
        title: section.title,
        columns: section.columns,
        items: section.items
          .map((item) => {
            const itemAnswers = section.columns
              .map((column, columnIndex) => {
                const cellKey = createAnswerKey(section.id, item.id, columnIndex);
                const optionId = answers[cellKey] ?? "not-entered";

                return {
                  column,
                  optionId
                };
              })
              .filter((answer) => answer.optionId !== "not-entered");

            if (itemAnswers.length === 0) {
              return null;
            }

            return {
              id: item.id,
              title: item.title,
              hint: item.hint,
              answers: itemAnswers
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      }))
      .filter((section) => section.items.length > 0);

    if (sections.length > 0) {
      return sections;
    }

    return parsedConfig.sections.map((section) => ({
      id: section.id,
      title: section.title,
      columns: section.columns,
      items: section.items.map((item) => ({
        id: item.id,
        title: item.title,
        hint: item.hint,
        answers: section.columns.map((column, columnIndex) => ({
          column,
          optionId: answers[createAnswerKey(section.id, item.id, columnIndex)] ?? "not-entered"
        }))
      }))
    }));
  }, [answers, parsedConfig.sections]);

  const shareUrl = useMemo(
    () =>
      typeof window === "undefined"
        ? ""
        : buildShareUrl({
            config: rawConfig !== defaultConfig ? rawConfig : undefined,
            answers,
            locale,
            theme
          }),
    [answers, defaultConfig, locale, rawConfig, theme]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextUrl = buildShareUrl({
      config: rawConfig !== defaultConfig ? rawConfig : undefined,
      answers,
      locale,
      theme
    });

    window.history.replaceState({}, "", nextUrl);
  }, [answers, defaultConfig, locale, rawConfig, theme]);

  function setAnswer(cellKey: string, optionId: string) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [cellKey]: optionId
    }));
  }

  async function copyText(value: string, successMessage: string) {
    await navigator.clipboard.writeText(value);
    setStatusMessage(successMessage);
  }

  async function handleExportImage() {
    const enteredName = window.prompt(t.exportPromptName, exportName || t.exportDefaultName);
    if (enteredName === null) {
      return;
    }

    const normalizedName = enteredName.trim() || t.exportDefaultName;
    setExportName(normalizedName);
    await waitForNextPaint();

    if (!exportCardRef.current) {
      return;
    }

    const dataUrl = await toPng(exportCardRef.current, {
      cacheBust: true,
      pixelRatio: 2.2,
      backgroundColor: "#fff8f4"
    });
    const link = document.createElement("a");
    link.download = `${t.exportFilePrefix}-${normalizedName.replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim() || "export"}.png`;
    link.href = dataUrl;
    link.click();
    setStatusMessage(t.exportedPng);
  }

  async function handleCopyLink() {
    await copyText(shareUrl, t.copiedLink);
  }

  async function handleCopyText() {
    await copyText(
      createSummaryText(parsedConfig.sections, answers, options),
      t.copiedText
    );
  }

  function handleDownloadText() {
    downloadFile(
      "kinklist.txt",
      createSummaryText(parsedConfig.sections, answers, options),
      "text/plain;charset=utf-8"
    );
    setStatusMessage(t.exportedTxt);
  }

  function handleConfigApply(nextValue: string) {
    startTransition(() => {
      setRawConfig(nextValue);
      setConfigDraft(nextValue);
      setAnswers({});
      setStatusMessage(t.configUpdated);
    });
  }

  const totalItems = parsedConfig.sections.reduce((sum, section) => sum + section.items.length, 0);
  const visibleItems = filteredSections.reduce((sum, section) => sum + section.items.length, 0);
  const answeredCount = Object.entries(answers).filter(
    ([, value]) => value && value !== "not-entered"
  ).length;
  const answeredItems = parsedConfig.sections.reduce(
    (sum, section) => sum + section.items.filter((item) => itemHasAnsweredValue(section, item)).length,
    0
  );
  const optionMap = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);

  return (
    <main className={`${styles.page} ${theme === "dark" ? styles.themeDark : styles.themeLight}`}>
      <div className={styles.shell}>
        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>{t.eyebrow}</p>
              <h1 className={styles.title}>{t.title}</h1>
              <p className={styles.lead}>{t.lead}</p>
            </div>

            <div className={styles.metaList}>
              <div className={styles.metaCard}>
                <strong>{parsedConfig.sections.length}</strong>
                <span>{t.sections}</span>
              </div>
              <div className={styles.metaCard}>
                <strong>{totalItems}</strong>
                <span>{t.items}</span>
              </div>
              <div className={styles.metaCard}>
                <strong>{options.length}</strong>
                <span>{t.variants}</span>
              </div>
              <div className={styles.metaCard}>
                <strong>{answeredCount}</strong>
                <span>{t.answeredCells}</span>
              </div>
              <div className={styles.metaCard}>
                <strong>{answeredItems}</strong>
                <span>{t.answeredItems}</span>
              </div>
              <div className={styles.metaCard}>
                <strong>{visibleItems}</strong>
                <span>{t.visibleItems}</span>
              </div>
            </div>
          </div>

          <div className={styles.panelControls}>
            <section className={styles.controlBlock}>
              <p className={styles.legendTitle}>{t.legendTitle}</p>
              <div className={styles.legendGrid}>
                {options.map((option) => (
                  <div className={styles.legendItem} key={option.id}>
                    <span className={styles.swatch} style={{ background: option.color }} />
                    <span>{option.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className={styles.controlBlock}>
              <div className={styles.toggleWrap}>
                <p className={styles.toggleLabel}>{t.localeLabel}</p>
                <div className={styles.selectWrap}>
                  <select
                    className={styles.selectInput}
                    onChange={(event) => setLocale(event.target.value as Locale)}
                    value={locale}
                  >
                    {localeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t[option.labelKey]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.toggleWrap}>
                <p className={styles.toggleLabel}>{t.themeLabel}</p>
                <div className={styles.toggleGrid}>
                  <button
                    className={`${styles.toggleButton} ${theme === "light" ? styles.toggleButtonActive : ""}`}
                    onClick={() => setTheme("light")}
                    type="button"
                  >
                    {t.lightTheme}
                  </button>
                  <button
                    className={`${styles.toggleButton} ${theme === "dark" ? styles.toggleButtonActive : ""}`}
                    onClick={() => setTheme("dark")}
                    type="button"
                  >
                    {t.darkTheme}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.controlBlock}>
              <div className={styles.searchWrap}>
                <label className={styles.searchLabel} htmlFor="search">
                  {t.searchLabel}
                </label>
                <input
                  className={styles.searchInput}
                  id="search"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  value={search}
                />
              </div>

              <div className={styles.toggleWrap}>
                <p className={styles.toggleLabel}>{t.filterLabel}</p>
                <div className={styles.toggleGridTriple}>
                  <button
                    className={`${styles.toggleButton} ${filterMode === "all" ? styles.toggleButtonActive : ""}`}
                    onClick={() => setFilterMode("all")}
                    type="button"
                  >
                    {t.filterAll}
                  </button>
                  <button
                    className={`${styles.toggleButton} ${filterMode === "answered" ? styles.toggleButtonActive : ""}`}
                    onClick={() => setFilterMode("answered")}
                    type="button"
                  >
                    {t.filterAnswered}
                  </button>
                  <button
                    className={`${styles.toggleButton} ${filterMode === "unanswered" ? styles.toggleButtonActive : ""}`}
                    onClick={() => setFilterMode("unanswered")}
                    type="button"
                  >
                    {t.filterUnanswered}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.controlBlock}>
              <div className={styles.actions}>
                <button className={styles.actionPrimary} onClick={handleExportImage} type="button">
                  {t.downloadPng}
                </button>
                <button className={styles.actionSecondary} onClick={handleDownloadText} type="button">
                  {t.downloadTxt}
                </button>
                <button className={styles.actionGhost} onClick={handleCopyText} type="button">
                  {t.copyText}
                </button>
                <button className={styles.actionGhost} onClick={handleCopyLink} type="button">
                  {t.copyLink}
                </button>
                <button
                  className={styles.actionSecondary}
                  onClick={() => setIsConfigOpen((currentValue) => !currentValue)}
                  type="button"
                >
                  {isConfigOpen ? t.hideConfigure : t.configure}
                </button>
              </div>

              <div className={styles.status}>{isPending ? t.updatingConfig : statusMessage}</div>
            </div>
          </div>

          {isConfigOpen ? (
            <section className={styles.configWrap}>
              <label className={styles.configLabel} htmlFor="config">
                {t.configLabel}
              </label>
              <textarea
                className={styles.configInput}
                id="config"
                onChange={(event) => setConfigDraft(event.target.value)}
                spellCheck={false}
                value={configDraft}
              />
              <div className={styles.configActions}>
                <button
                  className={styles.actionPrimary}
                  onClick={() => handleConfigApply(configDraft)}
                  type="button"
                >
                  {t.applyConfig}
                </button>
                <button
                  className={styles.actionGhost}
                  onClick={() => {
                    setConfigDraft(defaultConfig);
                    handleConfigApply(defaultConfig);
                  }}
                  type="button"
                >
                  {t.restoreDefault}
                </button>
              </div>
              <p className={styles.hint}>{t.configFormatHelp}</p>
            </section>
          ) : null}
        </aside>

        <section className={styles.board} ref={exportRef}>
          <div className={styles.boardHeader}>
            <div>
              <h2 className={styles.boardTitle}>{t.boardTitle}</h2>
              <p className={styles.boardText}>{t.boardText}</p>
            </div>
            <div className={styles.inlineActions}>
              <button
                className={styles.actionGhost}
                onClick={() => setAnswers({})}
                type="button"
              >
                {t.resetAnswers}
              </button>
            </div>
          </div>

          {filteredSections.length === 0 ? (
            <div className={styles.empty}>{t.noResults}</div>
          ) : (
            <div className={styles.sections}>
              {filteredSections.map((section) => (
                <article className={styles.section} key={section.id}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>{section.title}</h3>
                  </div>
                  <div className={styles.itemsList}>
                    {section.items.map((item) => (
                      <div className={styles.itemRow} key={item.id}>
                        <div className={styles.itemMeta}>
                          <div className={styles.itemTitle}>{item.title}</div>
                          {item.hint ? <div className={styles.itemHint}>{item.hint}</div> : null}
                        </div>
                        <div className={styles.answersGrid}>
                          {section.columns.map((column, columnIndex) => {
                            const cellKey = createAnswerKey(section.id, item.id, columnIndex);
                            const selectedValue = answers[cellKey] ?? "not-entered";

                            return (
                              <div className={styles.answerColumn} key={`${section.id}-${item.id}-${columnIndex}`}>
                                <div
                                  className={`${styles.answerColumnHeader} ${
                                    column ? "" : styles.answerColumnHeaderEmpty
                                  }`}
                                >
                                  {column || " "}
                                </div>
                                <div className={styles.choiceGrid}>
                                  {options.map((option) => {
                                    const isSelected = selectedValue === option.id;
                                    return (
                                      <button
                                        className={`${styles.optionButton} ${
                                          isSelected ? styles.optionButtonSelected : styles.optionButtonMuted
                                        }`}
                                        aria-label={option.label}
                                        key={option.id}
                                        onClick={() => setAnswer(cellKey, option.id)}
                                        style={{
                                          background: option.color
                                        }}
                                        title={option.label}
                                        type="button"
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          pointerEvents: "none"
        }}
      >
        <div className={`${styles.exportBoard} ${theme === "dark" ? styles.themeDark : styles.themeLight}`} ref={exportCardRef}>
          <div className={styles.exportHeader}>
            <div>
              <h2 className={styles.exportName}>{exportName || t.exportDefaultName}</h2>
              <p className={styles.exportMeta}>{t.exportSubtitle}</p>
              <p className={styles.exportMetaSecondary}>
                {answeredItems > 0 ? t.exportFilledOnly : t.exportAllItems}
              </p>
            </div>
            <div className={styles.legendGrid}>
              {options.map((option) => (
                <div className={styles.legendItem} key={`export-${option.id}`}>
                  <span className={styles.swatch} style={{ background: option.color }} />
                  <span>{option.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.exportSections}>
            {exportSections.map((section) => (
              <article className={`${styles.section} ${styles.exportSection}`} key={`export-section-${section.id}`}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>{section.title}</h3>
                </div>
                <div className={styles.exportItems}>
                  {section.items.map((item) => (
                    <div className={styles.exportItem} key={`export-item-${item.id}`}>
                      <div className={styles.itemTitle}>{item.title}</div>
                      {item.hint ? <div className={styles.itemHint}>{item.hint}</div> : null}
                      <div className={styles.exportAnswerList}>
                        {item.answers.map((answer, answerIndex) => {
                          const selectedOption = optionMap.get(answer.optionId) ?? optionMap.get("not-entered");

                          return (
                            <div className={styles.exportAnswerRow} key={`export-answer-${item.id}-${answerIndex}`}>
                              <span className={styles.exportColumnLabel}>
                                {answer.column || `${t.itemColumn} ${answerIndex + 1}`}
                              </span>
                              <span
                                className={styles.answerBadge}
                                style={{
                                  background: selectedOption?.color ?? "#ffffff",
                                  color: selectedOption?.textColor ?? "#2c1a1a"
                                }}
                              >
                                {selectedOption?.label ?? t.notEnteredLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
