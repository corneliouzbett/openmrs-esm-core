import * as i18next from "i18next";
import ICU from "i18next-icu";
import i18nextXhrBackend from "i18next-xhr-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import type { i18n } from "i18next";
import { initReactI18next } from "react-i18next";

declare global {
  interface Window {
    i18next: i18n;
  }
}

const languageChangeObserver = new MutationObserver(() => {
  const reDetect: any = undefined;
  window.i18next
    .changeLanguage(reDetect)
    .catch((e) => console.error("i18next failed to re-detect language", e));
});

languageChangeObserver.observe(document.documentElement, {
  attributeFilter: ["lang"],
  attributes: true,
});

function decodeHtmlEntity(html: string) {
  const textArea = document.createElement("textarea");
  textArea.innerHTML = html;
  return textArea.value;
}

export function setupI18n() {
  window.i18next = i18next.default || i18next;

  return window.i18next
    .use(LanguageDetector)
    .use(i18nextXhrBackend)
    .use(initReactI18next)
    .use(ICU)
    .init({
      backend: {
        parse: (data) => data,
        loadPath: "{{lng}}|{{ns}}",
        ajax(url, _, callback) {
          const [language, namespace] = url.split("|");

          if (namespace === "translation") {
            callback(null, { status: 404 });
          } else {
            System.import(decodeHtmlEntity(namespace))
              .then((m) => {
                if (typeof m.importTranslation !== "function") {
                  throw Error(
                    `Module ${namespace} does not export an importTranslation function`
                  );
                }

                const importPromise = m.importTranslation(`./${language}.json`);

                if (!(importPromise instanceof Promise)) {
                  throw Error(
                    `Module ${namespace} exports an importTranslation function that does not return a promise. Did you forget to set require.context mode to 'lazy'?`
                  );
                }

                return importPromise;
              })
              .then((json) => callback(json, { status: 200 }), (err) => callback(null, { status: 404, message: err }));
          }
        },
      },
      detection: {
        order: ["querystring", "htmlTag", "localStorage", "navigator"],
      },
      fallbackLng: "en",
    });
}
