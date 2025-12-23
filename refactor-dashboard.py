#!/usr/bin/env python3
"""
Script to refactor dashboard.ejs by replacing modal sections with component includes
"""

def refactor_dashboard():
    # Read the original file
    with open('views/dashboard.ejs', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find New Stream Modal start and end
    new_modal_start = None
    new_modal_end = None
    
    for i, line in enumerate(lines):
        if 'id="newStreamModal"' in line and 'class="fixed' in line:
            new_modal_start = i
            print(f"Found New Stream Modal start at line {i+1}")
        if '<!-- Close newStreamModal -->' in line and new_modal_start is not None and new_modal_end is None:
            new_modal_end = i + 1  # Include the closing div
            print(f"Found New Stream Modal end at line {i+1}")
            break
    
    if new_modal_start is None or new_modal_end is None:
        print("ERROR: Could not find New Stream Modal boundaries")
        return False
    
    # Create new content
    new_content = []
    
    # Add everything before New Stream Modal
    new_content.extend(lines[:new_modal_start])
    
    # Add the include statement
    new_content.append('      \n')
    new_content.append('      <!-- New Stream Modal (Refactored) -->\n')
    new_content.append("      <%- include('partials/modals/new-stream-modal') %>\n")
    new_content.append('      \n')
    
    # Add everything after New Stream Modal
    new_content.extend(lines[new_modal_end:])
    
    # Write the new file
    with open('views/dashboard.ejs', 'w', encoding='utf-8') as f:
        f.writelines(new_content)
    
    original_lines = len(lines)
    new_lines = len(new_content)
    removed_lines = original_lines - new_lines
    
    print(f"\n✅ Refactoring complete!")
    print(f"Original: {original_lines} lines")
    print(f"New: {new_lines} lines")
    print(f"Removed: {removed_lines} lines ({removed_lines/original_lines*100:.1f}%)")
    
    return True

if __name__ == '__main__':
    print("Starting dashboard.ejs refactoring...")
    print("=" * 60)
    success = refactor_dashboard()
    if success:
        print("\n✅ Dashboard refactored successfully!")
        print("Next: Test the application to ensure everything works")
    else:
        print("\n❌ Refactoring failed!")
