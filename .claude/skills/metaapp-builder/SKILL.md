---
name: metaapp-builder
description: >
  Package completed MetaApp frontend projects into distributable zip archives.
  Use this skill when users request to package, bundle, or create a distribution archive of their MetaApp project.
  Automatically detects MetaApp project structure, validates required files, and creates a timestamped zip file.
  Trigger phrases include: "帮我打包xxx项目", "打包这个MetaApp", "创建dist包", "生成zip压缩包".
---

# MetaApp Builder Skill

This skill packages completed MetaApp frontend projects into distributable `.zip` archives for deployment, distribution, or blockchain storage.

## Purpose

After developing a MetaApp using the `metaapp-develop` skill, users need to package the project for:
- Distribution to end users
- Uploading to blockchain storage (MetaFS)
- Deployment to hosting services
- Sharing with other developers

## When to Use

Trigger this skill when users say:
- "帮我打包xxx项目" (Help me package xxx project)
- "打包这个MetaApp" (Package this MetaApp)
- "创建dist包" (Create a dist package)
- "生成zip压缩包" (Generate a zip archive)
- "把这个项目打包成zip" (Package this project into zip)

## Packaging Rules

### Project Structure Requirements

A valid MetaApp project must contain:
- **Required files:**
  - `index.html` - Application entry point
  - `app.js` - Application configuration
  - `app.css` - Global styles
  - `idframework.js` - Framework core

- **Required directories:**
  - `idcomponents/` - Web Components directory
  - `commands/` - Commands directory

### Output Format

- **File name**: `dist-<unix_timestamp>.zip` (e.g., `dist-1738070400.zip`)
- **Output location**: Same directory as the MetaApp project root
- **Contents**: All files and subdirectories from the project root (excluding build artifacts and version control)

### Excluded Files/Directories

The packaging script automatically excludes:
- `.git/` - Git repository
- `.idea/`, `.vscode/` - IDE configuration
- `node_modules/` - Dependencies (not needed for No-Build projects)
- `__pycache__/` - Python cache
- `dist/`, `build/` - Build output directories
- `.DS_Store` - macOS system files
- Files starting with `.` (hidden files, except those explicitly needed)

## Usage Workflow

### Step 1: Identify Project Directory

When user requests packaging:
1. If user specifies a path: Use that path
2. If no path specified: Search current workspace for MetaApp projects
   - Look for directories containing `index.html`, `app.js`, `app.css`, `idframework.js`
   - If multiple found, ask user to confirm
   - If single match, proceed automatically

### Step 2: Validate Project Structure

Run validation to ensure the directory is a valid MetaApp:
- Check for required files
- Check for required directories
- Report any missing components

### Step 3: Execute Packaging Script

Run the packaging script:
```bash
python .agent/skills/metaapp-builder/scripts/package_metaapp.py <project_path>
```

The script will:
1. Validate project structure
2. Create zip archive with all project files
3. Name it `dist-<timestamp>.zip`
4. Place it in the project root directory
5. Report success with full path

### Step 4: Report Results

Inform user:
- Success message with zip file path
- File size (optional)
- Next steps (upload to MetaFS, deploy, etc.)

## Script: package_metaapp.py

The packaging script (`scripts/package_metaapp.py`) handles:
- Project structure validation
- File collection and filtering
- Zip archive creation
- Timestamp generation
- Error handling and reporting

### Script Usage

```bash
# Package project in current directory
python scripts/package_metaapp.py .

# Package specific project
python scripts/package_metaapp.py /path/to/metaapp-project

# With explicit output (optional)
python scripts/package_metaapp.py /path/to/metaapp-project --output /custom/path
```

### Script Behavior

1. **Validation**: Checks for required files and directories
2. **Collection**: Walks directory tree, collecting all files
3. **Filtering**: Excludes build artifacts, version control, IDE files
4. **Archiving**: Creates zip with relative paths preserved
5. **Output**: Saves to project root with timestamped name

## Example Workflow

**User**: "帮我打包 test/thumder 项目"

**Agent Actions**:
1. Verify `test/thumder` contains required MetaApp files
2. Run: `python .agent/skills/metaapp-builder/scripts/package_metaapp.py test/thumder`
3. Report: "✅ 打包完成！压缩包已生成: test/thumder/dist-1738070400.zip"

**User**: "打包这个MetaApp"

**Agent Actions**:
1. Search workspace for MetaApp projects
2. If single match found, proceed
3. If multiple matches, ask user to specify
4. Run packaging script
5. Report results

## Integration with metaapp-develop

This skill complements `metaapp-develop`:
- **metaapp-develop**: Creates and develops MetaApp projects
- **metaapp-builder**: Packages completed projects for distribution

Together they form a complete development-to-distribution workflow.

## Resources

- **Packaging Script**: `scripts/package_metaapp.py` - Executable Python script for packaging
- **Development Skill**: Use `metaapp-develop` skill for creating MetaApp projects

---

Remember: Always validate project structure before packaging. The zip file should contain everything needed to run the MetaApp, but exclude development-only files.
