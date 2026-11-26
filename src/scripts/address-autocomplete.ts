import { query } from "./dom";

const MIN_INPUT_LENGTH = 3;
const DEBOUNCE_MS = 300;

export type Address = string | google.maps.places.Place;

type SuggestionOptions = Omit<
  google.maps.places.AutocompleteRequest,
  "input" | "sessionToken"
>;

/**
 * Turns a text input into an ARIA combobox backed by Places autocomplete.
 * Requests wait for a pause in typing so each search uses only a few of the
 * project's daily Places requests. Returns a reader for the chosen place, or
 * the typed text when nothing was picked.
 *
 * https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 */
export function addressAutocomplete(
  input: HTMLInputElement,
  popup: HTMLElement,
  places: google.maps.PlacesLibrary,
  options: SuggestionOptions,
): () => Address {
  const listbox = query(popup, "[role=listbox]", HTMLUListElement);
  popup.append(
    new places.PlaceAttributionElement({ darkSchemeColor: "WHITE" }),
  );

  input.role = "combobox";
  input.ariaAutoComplete = "list";
  input.ariaExpanded = "false";
  input.setAttribute("aria-controls", listbox.id);

  let sessionToken = new places.AutocompleteSessionToken();
  let predictions: google.maps.places.PlacePrediction[] = [];
  let activeIndex = -1;
  let place: google.maps.places.Place | undefined;
  let debounce: number | undefined;
  let latestRequest = 0;

  const optionId = (index: number) => `${listbox.id}-${index}`;

  const setActive = (index: number) => {
    activeIndex = index;
    for (const [i, option] of [...listbox.children].entries()) {
      option.ariaSelected = String(i === index);
    }
    if (index >= 0) {
      input.setAttribute("aria-activedescendant", optionId(index));
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  };

  const close = () => {
    window.clearTimeout(debounce);
    latestRequest++;
    popup.hidden = true;
    input.ariaExpanded = "false";
    setActive(-1);
  };

  const select = (index: number) => {
    const prediction = predictions[index];
    if (!prediction) return;
    input.value = prediction.text.text;
    place = prediction.toPlace();
    sessionToken = new places.AutocompleteSessionToken();
    close();
  };

  const render = () => {
    listbox.replaceChildren(
      ...predictions.map((prediction, index) => {
        const option = document.createElement("li");
        option.id = optionId(index);
        option.role = "option";
        const main = document.createElement("strong");
        main.textContent = prediction.mainText?.text ?? prediction.text.text;
        const secondary = document.createElement("span");
        secondary.textContent = prediction.secondaryText?.text ?? "";
        option.append(main, secondary);
        option.addEventListener("pointerdown", (event) =>
          event.preventDefault(),
        );
        option.addEventListener("click", () => select(index));
        return option;
      }),
    );
    popup.hidden = predictions.length === 0;
    input.ariaExpanded = String(!popup.hidden);
    setActive(-1);
  };

  const fetchSuggestions = async (text: string) => {
    const request = ++latestRequest;
    try {
      const { suggestions } =
        await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          ...options,
          input: text,
          sessionToken,
        });
      if (request !== latestRequest) return;
      predictions = suggestions.flatMap(({ placePrediction }) =>
        placePrediction ? [placePrediction] : [],
      );
      render();
    } catch (error) {
      // Typed addresses still route when suggestions fail (e.g. quota).
      console.warn(error);
      if (request === latestRequest) close();
    }
  };

  input.addEventListener("input", () => {
    place = undefined;
    close();
    const text = input.value.trim();
    if (text.length < MIN_INPUT_LENGTH) return;
    debounce = window.setTimeout(
      () => void fetchSuggestions(text),
      DEBOUNCE_MS,
    );
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && activeIndex < 0) {
      close();
      return;
    }
    if (popup.hidden) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((activeIndex + 1) % predictions.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive(activeIndex <= 0 ? predictions.length - 1 : activeIndex - 1);
        break;
      case "Enter":
        event.preventDefault();
        select(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
    }
  });

  input.addEventListener("blur", close);

  return () => place ?? input.value.trim();
}
