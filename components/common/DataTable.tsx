import { ReactNode } from "react";

type Column<T> = {
  header: string;
  key: keyof T;
  align?: "left" | "right";
};

type DataTableProps<T extends Record<string, ReactNode>> = {
  columns: Column<T>[];
  rows: T[];
};

export function DataTable<T extends Record<string, ReactNode>>({
  columns,
  rows,
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#d8d4c5]">
      <table className="min-w-full divide-y divide-[#e2dece] text-sm">
        <thead className="bg-[#f4f1e6] text-left text-xs uppercase tracking-wide text-[#717865]">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`px-4 py-3 font-semibold ${
                  column.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#ebe7d8] bg-[#fffef9] text-[#596151]">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-[#f5f2e8]">
              {columns.map((column) => (
                <td
                  key={`${String(column.key)}-${rowIndex}`}
                  className={`px-4 py-3 ${
                    column.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
