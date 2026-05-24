import { useState, useCallback } from 'react';

function runSanitizer(value, rules = [], isBlur = false) {
  if (value === null || value === undefined) return '';
  let val = String(value);

  for (const rule of rules) {
    if (rule === 'trim' && isBlur) {
      val = val.trim();
    }
    if (rule === 'strip_dangerous') {
      val = val.replace(/[<>]/g, '');
    }
    if (rule === 'location') {
      val = val.replace(/[^a-zA-Z0-9\s.,-]/g, '');
    }
    if (typeof rule === 'object' && rule.maxLength) {
      val = val.slice(0, rule.maxLength);
    }
  }
  return val;
}

function runValidator(value, rule) {
  if (rule === 'required') {
    return String(value).trim().length === 0 ? 'This field is required.' : null;
  }
  if (rule === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())
      ? null
      : 'Enter a valid email address.';
  }
  if (rule && typeof rule === 'object') {
    if ('minLength' in rule) {
      return String(value).length < rule.minLength
        ? `Must be at least ${rule.minLength} characters.`
        : null;
    }
    if ('maxLength' in rule) {
      return String(value).length > rule.maxLength
        ? `Must be at most ${rule.maxLength} characters.`
        : null;
    }
  }
  return null;
}

function validateField(value, rules = []) {
  for (const rule of rules) {
    const error = runValidator(value, rule);
    if (error) return error;
  }
  return null;
}

function validateAll(values, validatorConfig, sanitizeConfig) {
  const errors = {};
  const sanitizedValues = { ...values };

  for (const field in validatorConfig) {
    // Apply blur-level sanitization before final validation
    if (sanitizeConfig && sanitizeConfig[field]) {
      sanitizedValues[field] = runSanitizer(values[field], sanitizeConfig[field], true);
    }
    const error = validateField(sanitizedValues[field], validatorConfig[field]);
    if (error) errors[field] = error;
  }
  return { errors, sanitizedValues };
}

export default function useFormValidation({ initialValues = {}, validate = {}, sanitize = {}, onSubmit }) {
  const [values, setValues]   = useState({ ...initialValues });
  const [errors, setErrors]   = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;
    
    if (sanitize[name]) {
      // Run sanitizers (but skip trim during typing to allow spaces)
      sanitizedValue = runSanitizer(value, sanitize[name], false);
    }

    setValues((prev) => {
      const next = { ...prev, [name]: sanitizedValue };
      setErrors((prevErr) => ({
        ...prevErr,
        [name]: validateField(sanitizedValue, validate[name]),
      }));
      return next;
    });
  }, [validate, sanitize]);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    if (sanitize[name]) {
      // Run all sanitizers including trim on blur
      sanitizedValue = runSanitizer(value, sanitize[name], true);
    }

    setValues((prev) => ({ ...prev, [name]: sanitizedValue }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(sanitizedValue, validate[name]),
    }));
  }, [validate, sanitize]);

  const handleSubmit = useCallback((e) => {
    if (e && e.preventDefault) e.preventDefault();
    const allTouched = Object.keys(initialValues).reduce(
      (acc, k) => ({ ...acc, [k]: true }), {}
    );
    setTouched(allTouched);
    
    const { errors: allErrors, sanitizedValues } = validateAll(values, validate, sanitize);
    setValues(sanitizedValues);
    setErrors(allErrors);
    
    if (Object.keys(allErrors).length === 0 && typeof onSubmit === 'function') {
      onSubmit(sanitizedValues);
    }
  }, [values, validate, sanitize, onSubmit, initialValues]);

  return { values, errors, touched, handleChange, handleBlur, handleSubmit, setValues };
}
