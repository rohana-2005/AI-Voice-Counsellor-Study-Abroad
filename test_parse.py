import json
import sys
import os

sys.path.append(os.path.join(os.getcwd(), "backend"))
from app.main import _extract_structured_from_webhook

payload_str = """
{"7aaa689d-06eb-49eb-ba25-a700bd8d42dc":{"name":"lead_info","result":"{\\n  \\"personal\\": {\\n    \\"name\\": \\"Jasmine\\",\\n    \\"phone\\": \\"911911\\",\\n    \\"email\\": \\"\\",\\n    \\"location\\": \\"Highlander, Thailand\\",\\n    \\"has_passport\\": false\\n  },\\n  \\"academic\\": {\\n    \\"education_level\\": \\"\\",\\n    \\"field\\": \\"Science\\",\\n    \\"institution\\": \\"\\",\\n    \\"gpa_percentage\\": \\"\\",\\n    \\"backlogs\\": 0,\\n    \\"graduation_year\\": 0\\n  },\\n  \\"professional\\": {\\n    \\"years_of_experience\\": 0,\\n    \\"current_role\\": \\"\\"\\n  },\\n  \\"test_status\\": {\\n    \\"exam_type\\": \\"None\\",\\n    \\"status\\": \\"Planning\\",\\n    \\"overall_score\\": \\"\\"\\n  },\\n  \\"preferences\\": {\\n    \\"target_countries\\": [],\\n    \\"course_interest\\": \\"Science\\",\\n    \\"intake_preferred\\": \\"\\",\\n    \\"budget_max_usd\\": 0\\n  },\\n  \\"intent_level\\": \\"Low\\",\\n  \\"summary_of_gaps\\": \\"Most details missing\\"\\n}"}}
"""

payload = json.loads(payload_str)
extracted = _extract_structured_from_webhook(payload)
print(json.dumps(extracted, indent=2))
