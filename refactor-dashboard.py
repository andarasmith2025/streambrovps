#!/usr/bin/env python3
"""
Script to refactor dashboard.ejs by replacing modal sections with component includes
"""

def refactor_dashboard():
    # Read the original file
    with open('views/dashboard.ejs', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    original_lines = len(lines)
    print(f"Original file: {original_lines} lines")
    print()
    
    # Find Edit Stream Modal start and end
    edit_modal_start = None
    edit_modal_end = None
    
    for i, line in enumerate(lines):
        if 'id="editStreamModal"' in line and 'class="fixed' in line:
            edit_modal_start = i
            print(f"✓ Found Edit Stream Modal start at line {i+1}")
        if '<!-- Close editStreamModal -->' in line and edit_modal_start is not None and edit_modal_end is None:
            edit_modal_end = i + 1  # Include the closing div
            print(f"✓ Found Edit Stream Modal end at line {i+1}")
            break
    
    if edit_modal_start is None or edit_modal_end is None:
        print("ERROR: Could not find Edit Stream Modal boundaries")
        print(f"edit_modal_start: {edit_modal_start}, edit_modal_end: {edit_modal_end}")
        return False
    
    edit_modal_lines = edit_modal_end - edit_modal_start
    print(f"✓ Edit Stream Modal: {edit_modal_lines} lines (will be replaced with 1 include)")
    print()
    
    # Create new content
    new_content = []
    
    # Add everything before Edit Stream Modal
    new_content.extend(lines[:edit_modal_start])
    
    # Add the include statement for Edit Stream Modal
    new_content.append('      \n')
    new_content.append('      <!-- Edit Stream Modal (Refactored) -->\n')
    new_content.append("      <%- include('partials/modals/edit-stream-modal') %>\n")
    new_content.append('      \n')
    
    # Add everything after Edit Stream Modal
    new_content.extend(lines[edit_modal_end:])
    
    # Write the new file
    with open('views/dashboard.ejs', 'w', encoding='utf-8') as f:
        f.writelines(new_content)
    
    new_lines = len(new_content)
    removed_lines = original_lines - new_lines
    
    print(f"✅ Refactoring complete!")
    print(f"Original: {original_lines} lines")
    print(f"New: {new_lines} lines")
    print(f"Removed: {removed_lines} lines ({removed_lines/original_lines*100:.1f}%)")
    
    return True

if __name__ == '__main__':
    print("=" * 60)
    print("Dashboard.ejs Refactoring - Edit Stream Modal")
    print("=" * 60)
    print()
    success = refactor_dashboard()
    print()
    if success:
        print("✅ Dashboard refactored successfully!")
        print("Next: Test the Edit Stream Modal functionality")
    else:
        print("❌ Refactoring failed!")
