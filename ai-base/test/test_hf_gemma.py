import unittest

import hf_gemma


class HfGemmaTests(unittest.TestCase):
    def test_default_payload_uses_supported_gemma_model(self):
        self.assertEqual(hf_gemma.build_payload()["model"], "google/gemma-4-31B-it:novita")

    def test_extract_message_rejects_error_payload(self):
        with self.assertRaisesRegex(RuntimeError, "Hugging Face API error"):
            hf_gemma.extract_message({"error": "Model is unavailable"})


if __name__ == "__main__":
    unittest.main()
