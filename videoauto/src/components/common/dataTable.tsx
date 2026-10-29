import type { DataTableColumn } from "./types";
import type { ReactNode } from "react";
import type * as React from "react";
import { EmptyState } from "./emptyState";
import "./common.css";

export function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  emptyState,
  className = "",
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: keyof T | ((row: T, index: number) => React.Key);
  emptyState?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`ui-table-wrap${className ? ` ${className}` : ""}`}>
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((column, i) => (
              <th
                key={String(column.key) + i}
                className={column.className}
                style={{ textAlign: column.align }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {emptyState ?? <EmptyState title="No data" />}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={String(
                  typeof rowKey === "function"
                    ? rowKey(row, index)
                    : row[rowKey],
                )}
              >
                {columns.map((column, i) => (
                  <td
                    key={String(column.key) + i}
                    className={column.className}
                    style={{ textAlign: column.align }}
                  >
                    {column.render
                      ? column.render(row, index)
                      : String(
                          (row as Record<string, unknown>)[
                            String(column.key)
                          ] ?? "",
                        )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
