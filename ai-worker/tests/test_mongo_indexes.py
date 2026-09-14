import unittest
from unittest.mock import Mock, patch

from app.rag.mongo_vector import ensure_mongo_indexes


class MongoIndexTests(unittest.TestCase):
    @patch("app.rag.mongo_vector.get_collection")
    @patch("app.rag.mongo_vector.get_document_status_collection")
    @patch("app.rag.mongo_vector.get_mongo_client")
    def test_required_indexes_are_created(
        self,
        get_mongo_client,
        get_document_status_collection,
        get_collection,
    ):
        client = Mock()
        status_collection = Mock()
        vector_collection = Mock()
        vector_collection.list_search_indexes.return_value = []
        get_mongo_client.return_value = client
        get_document_status_collection.return_value = status_collection
        get_collection.return_value = vector_collection

        ensure_mongo_indexes()

        client.admin.command.assert_called_once_with("ping")
        status_collection.create_index.assert_any_call(
            [("documentId", 1), ("userId", 1)],
            unique=True,
            name="document_user_unique",
        )
        status_collection.create_index.assert_any_call(
            [("userId", 1), ("updatedAt", -1)],
            name="user_updated_at",
        )
        vector_collection.create_index.assert_called_once_with(
            [("tenant_id", 1), ("document_id", 1)],
            name="tenant_document",
        )


if __name__ == "__main__":
    unittest.main()
