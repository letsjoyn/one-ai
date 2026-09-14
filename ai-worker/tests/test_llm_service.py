import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from app.services.llm_service import build_rag_answer


class LlmServiceTests(unittest.TestCase):
    @patch("app.services.llm_service.Groq")
    @patch("app.services.llm_service.get_vector_store")
    @patch("app.services.llm_service.get_settings")
    def test_retrieval_is_tenant_scoped(self, get_settings, get_vector_store, groq):
        get_settings.return_value = SimpleNamespace(
            groq_api_key="test-key",
            groq_model="test-model",
        )

        document = SimpleNamespace(
            page_content="The policy renews annually.",
            metadata={
                "source_path": "tenants/tenant-1/policy.pdf",
                "chunk_number": 2,
                "document_id": "document-1",
            },
        )
        vector_store = Mock()
        vector_store.similarity_search.return_value = [document]
        get_vector_store.return_value = vector_store

        completion = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="It renews annually [1]."))]
        )
        groq.return_value.chat.completions.create.return_value = completion

        result = build_rag_answer("tenant-1", "When does it renew?", top_k=3)

        vector_store.similarity_search.assert_called_once_with(
            "When does it renew?",
            k=3,
            pre_filter={"tenant_id": "tenant-1"},
        )
        request = groq.return_value.chat.completions.create.call_args.kwargs
        self.assertIn("\n\n=== BEGIN UNTRUSTED DOCUMENT CONTEXT", request["messages"][1]["content"])
        self.assertEqual(result["sources"][0]["documentId"], "document-1")

    def test_greeting_shortcut_returns_zero_sources(self):
        for greeting in ["hi", "hii", "hello", "hey", "Good Morning", "good afternoon"]:
            result = build_rag_answer("tenant-1", greeting)
            self.assertEqual(result["sources"], [])
            self.assertEqual(result["answer"], "Hi! Ask me a question about your uploaded documents.")


if __name__ == "__main__":
    unittest.main()
