import unittest


class TestMcpShelfSdk(unittest.TestCase):
    def test_imports_and_entrypoints(self):
        import mcpshelf
        from mcpshelf import cli, server

        self.assertTrue(hasattr(cli, "main"))
        self.assertTrue(hasattr(server, "main"))
        self.assertIsNotNone(mcpshelf)


if __name__ == "__main__":
    unittest.main()
