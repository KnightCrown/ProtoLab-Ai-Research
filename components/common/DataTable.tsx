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
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
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
        <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
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
