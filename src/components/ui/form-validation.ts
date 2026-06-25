function getFieldLabel(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const explicitLabel = field.getAttribute("aria-label");
  if (explicitLabel) return explicitLabel;

  const label = field.closest("label");
  const labelText = label?.querySelector("span")?.textContent || label?.textContent;
  if (labelText) return labelText.trim().replace(/\s+/g, " ");

  return field.name || "campo obrigatório";
}

export function getInvalidFieldMessage(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const label = getFieldLabel(field);
  const validity = field.validity;

  if (validity.valueMissing) return `Preencha o campo ${label}.`;
  if (validity.typeMismatch) return `Revise o campo ${label}.`;
  if (validity.rangeUnderflow || validity.rangeOverflow || validity.stepMismatch) return `Revise o valor do campo ${label}.`;
  if (validity.tooShort || validity.tooLong) return `Revise o tamanho do campo ${label}.`;
  if (validity.patternMismatch) return `Revise o formato do campo ${label}.`;

  return field.validationMessage || `Revise o campo ${label}.`;
}

export function isFirstInvalidField(
  field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
) {
  const form = field.form;
  if (!form) return true;
  return form.querySelector(":invalid") === field;
}
