/** Skill scanner — reads ~/.openclaw/workspace/skills/ SKILL.md files */
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

export interface SkillMeta {
  name: string;
  description: string;
  triggers: string[];
  path: string;
}

export class SkillScanner {
  private skills: SkillMeta[] = [];

  async scan(): Promise<void> {
    this.skills = [];
    const dir = path.join(os.homedir(), ".openclaw/workspace/skills");
    try {
      for (const entry of await fs.readdir(dir)) {
        try {
          const mdPath = path.join(dir, entry, "SKILL.md");
          const content = await fs.readFile(mdPath, "utf-8");
          const desc = content.match(/description:\s*(.+)/)?.[1]?.trim() ?? entry;
          const triggers = desc.toLowerCase().split(/[\s,;:]+/).filter(w => w.length > 3).slice(0, 8);
          this.skills.push({ name: entry, description: desc, triggers, path: mdPath });
        } catch { /* skip */ }
      }
    } catch { /* dir not found */ }
    console.log(`[SkillScanner] Loaded ${this.skills.length} skills`);
  }

  match(input: string): SkillMeta[] {
    const words = input.toLowerCase().split(/\s+/);
    return this.skills.filter(s => s.triggers.some(t => words.some(w => w.includes(t) || t.includes(w))));
  }

  getAll(): SkillMeta[] { return this.skills; }
  get count(): number { return this.skills.length; }
}

export const skillScanner = new SkillScanner();
