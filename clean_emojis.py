import os
import re

# List of common emojis used in the project
emojis_to_remove = ['🔴', '🟢', '⚠️', '❌', '🦐', '⚡', '🚨', '⏱️', '🚀', '✅', '🔍', '📊', '📈', '💾', '🔬', '💡', '📝', '👉', '⚠️', '⏱', '🧪']

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for emoji in emojis_to_remove:
        content = content.replace(emoji + " ", "")
        content = content.replace(emoji, "")
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Cleaned: {filepath}")

for root, dirs, files in os.walk('/Users/deranindugunasekara/Desktop/AquaNext-AI-ShrimpFarm-25-26J-385/backend-v2'):
    if 'venv' in root or '.git' in root or '__pycache__' in root:
        continue
    for file in files:
        if file.endswith('.py') or file.endswith('.md') or file.endswith('.sh') or file.endswith('.ts') or file.endswith('.tsx'):
            clean_file(os.path.join(root, file))

print("Emoji cleanup complete.")
