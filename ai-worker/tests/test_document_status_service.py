import unittest
from unittest.mock import Mock, patch

from app.services.document_status_service import (
    claim_document_processing,
    list_documents_for_user,
    mark_document_deleted,
)


class DocumentStatusServiceTests(unittest.TestCase):
    @patch("app.services.document_status_service.get_document_status_collection")
    def test_deleted_documents_are_hidden_from_workspace_lists(self, get_collection):
        collection = Mock()
        cursor = Mock()
        collection.find.return_value = cursor
        cursor.sort.return_value = cursor
        cursor.limit.return_value = [{"documentId": "document-1", "status": "ready"}]
        get_collection.return_value = collection

        result = list_documents_for_user("workspace-1", limit=20)

        collection.find.assert_called_once_with(
            {"userId": "workspace-1", "status": {"$ne": "deleted"}},
            {"_id": 0},
        )
        cursor.sort.assert_called_once_with("updatedAt", -1)
        cursor.limit.assert_called_once_with(20)
        self.assertEqual(result[0]["documentId"], "document-1")

    @patch("app.services.document_status_service.get_document_status_collection")
    def test_processing_claim_excludes_ready_and_deleted_documents(self, get_collection):
        collection = Mock()
        get_collection.return_value = collection

        claim_document_processing(
            document_id="document-1",
            user_id="workspace-1",
            file_path="tenants/workspace-1/document.pdf",
        )

        query = collection.find_one_and_update.call_args.args[0]
        self.assertEqual(query["status"], {"$nin": ["ready", "deleted"]})

    @patch("app.services.document_status_service.get_document_status_collection")
    def test_deletion_creates_a_persistent_tombstone(self, get_collection):
        collection = Mock()
        collection.find_one_and_update.return_value = {
            "documentId": "document-1",
            "status": "deleted",
        }
        get_collection.return_value = collection

        result = mark_document_deleted(
            document_id="document-1",
            user_id="workspace-1",
        )

        update = collection.find_one_and_update.call_args.args[1]
        self.assertEqual(update["$set"]["status"], "deleted")
        self.assertEqual(result["status"], "deleted")


if __name__ == "__main__":
    unittest.main()
