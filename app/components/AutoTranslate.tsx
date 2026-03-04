"use client";

import { useEffect, useMemo } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { useTranslations } from "@/app/context/TranslationContext";

const textOriginalMap = new WeakMap<Text, string>();

function translateExact(value: string, dictionary: Record<string, string>): string {
  const translated = dictionary[value];
  return translated ?? value;
}

function translateTextNode(node: Text, dictionary: Record<string, string>) {
  const current = node.nodeValue ?? "";
  const original = textOriginalMap.get(node) ?? current;
  if (!textOriginalMap.has(node)) {
    textOriginalMap.set(node, current);
  }

  const match = original.match(/^(\s*)(.*?)(\s*)$/s);
  if (!match) return;
  const leading = match[1] ?? "";
  const core = match[2] ?? "";
  const trailing = match[3] ?? "";
  if (!core) return;

  const translatedCore = translateExact(core, dictionary);
  const nextValue = `${leading}${translatedCore}${trailing}`;
  if (nextValue !== current) {
    node.nodeValue = nextValue;
  }
}

function translateAttributes(root: ParentNode, dictionary: Record<string, string>) {
  const selectors = [
    "[placeholder]",
    "[title]",
    "[aria-label]",
  ].join(",");
  const elements = root.querySelectorAll<HTMLElement>(selectors);

  elements.forEach((el) => {
    const attrs: Array<{ attr: "placeholder" | "title" | "aria-label"; originalDataKey: string }> = [
      { attr: "placeholder", originalDataKey: "i18nPlaceholderOriginal" },
      { attr: "title", originalDataKey: "i18nTitleOriginal" },
      { attr: "aria-label", originalDataKey: "i18nAriaLabelOriginal" },
    ];

    attrs.forEach(({ attr, originalDataKey }) => {
      const current = el.getAttribute(attr);
      if (!current) return;

      const dataset = el.dataset as Record<string, string | undefined>;
      const original = dataset[originalDataKey] ?? current;
      if (!dataset[originalDataKey]) {
        dataset[originalDataKey] = current;
      }

      const translated = translateExact(original, dictionary);
      if (translated !== current) {
        el.setAttribute(attr, translated);
      }
    });
  });
}

function translateDom(root: ParentNode, dictionary: Record<string, string>) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const textNode = node as Text;
      const parent = textNode.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") {
        return NodeFilter.FILTER_REJECT;
      }
      if (!(textNode.nodeValue ?? "").trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode();
  while (node) {
    translateTextNode(node as Text, dictionary);
    node = walker.nextNode();
  }

  translateAttributes(root, dictionary);
}

export function AutoTranslate() {
  const { mounted } = useLanguage();
  const { dictionary } = useTranslations();

  const dictSize = useMemo(() => Object.keys(dictionary).length, [dictionary]);

  useEffect(() => {
    if (!mounted || typeof document === "undefined") return;
    const root = document.body;
    if (!root) return;

    translateDom(root, dictionary);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
          translateTextNode(mutation.target as Text, dictionary);
          continue;
        }

        mutation.addedNodes.forEach((added) => {
          if (added.nodeType === Node.TEXT_NODE) {
            translateTextNode(added as Text, dictionary);
          } else if (added.nodeType === Node.ELEMENT_NODE) {
            translateDom(added as ParentNode, dictionary);
          }
        });
      }
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [dictionary, dictSize, mounted]);

  return null;
}

export default AutoTranslate;
