import { useState } from 'react';

export default function useForm(initialValue, validate = {}) {
  const [formData, setFormData] = useState(initialValue);
  const [errMsg, setErrMsg] = useState({});

  function setFormValue(key, value) {
    setFormData({ ...formData, [key]: value });

    const curErrMsg = validate[key](value);
    setErrMsg({ ...errMsg, [key]: curErrMsg || null });
  }

  function resetFormData() {
    setFormData(initialValue);
  }
  return [formData, errMsg, setFormValue, resetFormData];
}
