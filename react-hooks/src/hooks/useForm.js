import { useState } from 'react';
export default function useForm(initialValue) {
  const [formData, setFormData] = useState(initialValue);

  function setFormValue(key, value) {
    setFormData({ ...formData, [key]: value });
  }

  function resetFormData() {
    setFormData(initialValue);
  }
  return [formData, setFormValue, resetFormData];
}
