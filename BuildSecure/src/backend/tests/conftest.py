"""Pytest configuration and fixtures."""

import sys
from pathlib import Path

# Add the parent directory to the path so that app can be imported.
sys.path.insert(0, str(Path(__file__).parent.parent))
