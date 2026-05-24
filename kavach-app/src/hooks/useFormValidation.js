import { useState, useCallback } from 'react';

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

function validateAll(values, validatorConfig) {
  const errors = {};
  for (const field in validatorConfig) {
    const error = validateField(values[field], validatorConfig[field]);
    if (error) errors[field] = error;
  }
  return errors;
}

export default function useFormValidation({ initialValues = {}, validate = {}, onSubmit }) {
  const [values, setValues]   = useState({ ...initialValues });
  const [errors, setErrors]   = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      setErrors((prevErr) => ({
        ...prevErr,
        [name]: validateField(value, validate[name]),
      }));
      return next;
    });
  }, [validate]);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(value, validate[name]),
    }));
  }, [validate]);

  const handleSubmit = useCallback((e) => {
    if (e && e.preventDefault) e.preventDefault();
    const allTouched = Object.keys(initialValues).reduce(
      (acc, k) => ({ ...acc, [k]: true }), {}
    );
    setTouched(allTouched);
    const allErrors = validateAll(values, validate);
    setErrors(allErrors);
    if (Object.keys(allErrors).length === 0 && typeof onSubmit === 'function') {
      onSubmit(values);
    }
  }, [values, validate, onSubmit, initialValues]);

  return { values, errors, touched, handleChange, handleBlur, handleSubmit };
}
