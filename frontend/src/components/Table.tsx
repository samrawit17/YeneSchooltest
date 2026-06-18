import React from 'react';

const Table = ({
  columns,
  renderRow,
  data,
}: {
  columns: {
    header: string;
    accessor: string | ((item: any) => React.ReactNode);
    className?: string;
    key?: string;
  }[];
  renderRow: (item: any) => React.ReactNode;
  data: any[];
}) => {
  // Ensure data is an array
  const tableData = Array.isArray(data) ? data : [];

  if (tableData.length === 0) {
    return (
      <table className="w-full mt-4">
        <thead>
          <tr className="text-left text-gray-500 text-sm">
            {columns.map((col, index) => (
              <th key={col.key || index} className={col.className}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={columns.length} className="text-center py-4 text-gray-500">
              No data available
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className="w-full mt-4">
      <thead>
        <tr className="text-left text-gray-500 text-sm">
          {columns.map((col, index) => (
            <th key={col.key || index} className={col.className}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>{tableData.map((item, index) => <React.Fragment key={(item as any)?.id || index}>{renderRow(item)}</React.Fragment>)}</tbody>
    </table>
  );
};

export default Table;
