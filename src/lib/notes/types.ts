export interface NoteCategory {
  id: string;
  name: string;
  notesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteWithCategory {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteFilterOptions {
  categoryId?: string; // "all", "uncategorized", or UUID
  search?: string;
  sort?: "newest" | "oldest";
}
