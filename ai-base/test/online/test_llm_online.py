import unittest

import test.online.llm_online as llm_online


class LlmOnlineTests(unittest.TestCase):
    def test_default_payload_uses_supported_online_llm_model(self):
        self.assertEqual(llm_online.build_payload()["model"], "google/gemma-4-31B-it:novita")

    def test_extract_message_rejects_error_payload(self):
        with self.assertRaisesRegex(RuntimeError, "Hugging Face API error"):
            llm_online.extract_message({"error": "Model is unavailable"})


if __name__ == "__main__":
    unittest.main()
