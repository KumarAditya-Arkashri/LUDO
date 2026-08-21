import { Cell } from '../models/cell.model';

export class BoardValidator {
  /**
   * Validates if the cell structure is inherently correct.
   */
  static validateCell(cell: Cell): void {
    if (!cell.id) {
      throw new Error('Cell must have an id');
    }
    if (cell.index < 0) {
      throw new Error(`Cell ${cell.id} has invalid index: ${cell.index}`);
    }
    if (!cell.coordinate || cell.coordinate.x < 0 || cell.coordinate.y < 0) {
      throw new Error(`Cell ${cell.id} has invalid coordinate`);
    }
  }

  /**
   * Validates that all cells in a board are unique by ID.
   */
  static validateBoard(cells: Map<string, Cell>): void {
    if (cells.size === 0) {
      throw new Error('Board must have cells');
    }
  }
}
