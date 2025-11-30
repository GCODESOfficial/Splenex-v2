const stripLeadingZeros = (input: string): string => {
  const stripped = input.replace(/^0+(?=\d)/, "");
  return stripped.length ? stripped : "0";
};

export const normalizeAmountString = (value: string): string => {
  let trimmed = value?.trim();
  if (!trimmed) {
    return "0";
  }

  let sign = "";
  if (trimmed.startsWith("-") || trimmed.startsWith("+")) {
    sign = trimmed.startsWith("-") ? "-" : "";
    trimmed = trimmed.slice(1);
  }

  if (/e/i.test(trimmed)) {
    const [coefficientRaw, exponentRaw] = trimmed.split(/e/i);
    const exponent = Number.parseInt(exponentRaw ?? "0", 10);
    if (!Number.isFinite(exponent)) {
      throw new Error(`Invalid numeric exponent: ${value}`);
    }

    const coefficient = coefficientRaw ?? "0";
    const digits = coefficient.replace('.', '');
    const decimalPlaces = coefficient.includes('.')
      ? coefficient.length - coefficient.indexOf('.') - 1
      : 0;

    let adjusted = digits;
    const zerosToAdd = exponent - decimalPlaces;

    if (zerosToAdd >= 0) {
      adjusted = digits + "0".repeat(zerosToAdd);
    } else {
      const sliceIndex = digits.length + zerosToAdd;
      if (sliceIndex <= 0) {
        adjusted = "0";
      } else {
        adjusted = digits.slice(0, sliceIndex);
      }
    }

    const normalized = stripLeadingZeros(adjusted);
    return sign + normalized;
  }

  if (trimmed.includes('.')) {
    const [intPart, fracPart = ""] = trimmed.split('.');
    const combined = stripLeadingZeros(intPart + fracPart);
    return sign + combined;
  }

  return sign + stripLeadingZeros(trimmed);
};

export const toBigIntSafe = (value: string): bigint => {
  const normalized = normalizeAmountString(value);
  return BigInt(normalized);
};

