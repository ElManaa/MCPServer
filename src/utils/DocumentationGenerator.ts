import * as fs from 'fs';
import * as path from 'path';
import { TaskDocContent } from '../types';
import { Logger } from './Logger';

/**
 * DocumentationGenerator
 * 
 * Utility class for automatically generating task documentation.
 * Creates markdown files in the docs folder with task details,
 * implementation information, and timestamps.
 */
export class DocumentationGenerator {
  private static readonly DOCS_FOLDER = 'docs';

  /**
   * Get the absolute path to the docs folder
   * @returns Absolute path to docs directory
   */
  static getDocsPath(): string {
    return path.join(process.cwd(), this.DOCS_FOLDER);
  }

  /**
   * Ensure the docs folder exists, create it if necessary
   */
  private static ensureDocsFolderExists(): void {
    const docsPath = this.getDocsPath();
    
    if (!fs.existsSync(docsPath)) {
      fs.mkdirSync(docsPath, { recursive: true });
      Logger.info('Created docs folder', { path: docsPath });
    }
  }

  /**
   * Generate a safe filename from a task name
   * @param taskName The task name to convert
   * @returns Sanitized filename
   */
  private static generateFilename(taskName: string): string {
    // Remove special characters and replace spaces with hyphens
    const sanitized = taskName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    // Add timestamp for uniqueness
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    return `${timestamp}-${sanitized}.md`;
  }

  /**
   * Format the markdown content for a task document
   * @param taskName The name of the task
   * @param content The task documentation content
   * @returns Formatted markdown string
   */
  private static formatMarkdown(taskName: string, content: TaskDocContent): string {
    const timestamp = new Date().toISOString();
    
    let markdown = `# ${taskName}\n\n`;
    markdown += `**Generated:** ${timestamp}\n\n`;
    markdown += `---\n\n`;
    
    // Objective section
    markdown += `## Objective\n\n`;
    markdown += `${content.objective}\n\n`;
    
    // Implementation section
    markdown += `## Implementation\n\n`;
    markdown += `${content.implementation}\n\n`;
    
    // Files section
    if (content.files && content.files.length > 0) {
      markdown += `## Files Modified/Created\n\n`;
      content.files.forEach(file => {
        markdown += `- \`${file}\`\n`;
      });
      markdown += `\n`;
    }
    
    // Notes section (optional)
    if (content.notes) {
      markdown += `## Notes\n\n`;
      markdown += `${content.notes}\n\n`;
    }
    
    return markdown;
  }

  /**
   * Create a task documentation file
   * @param taskName The name/title of the task
   * @param content The documentation content
   */
  static createTaskDoc(taskName: string, content: TaskDocContent): void {
    try {
      // Ensure docs folder exists
      this.ensureDocsFolderExists();
      
      // Generate filename and full path
      const filename = this.generateFilename(taskName);
      const filePath = path.join(this.getDocsPath(), filename);
      
      // Format markdown content
      const markdown = this.formatMarkdown(taskName, content);
      
      // Write file
      fs.writeFileSync(filePath, markdown, 'utf-8');
      
      Logger.info('Task documentation created', { 
        taskName, 
        filename,
        path: filePath 
      });
    } catch (error) {
      Logger.error('Failed to create task documentation', error as Error, { 
        taskName 
      });
      throw error;
    }
  }
}
