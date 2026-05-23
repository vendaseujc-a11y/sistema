import React from 'react';

export const Table: React.FC<React.HTMLAttributes<HTMLTableElement>> = ({ children, className = '', ...props }) => {
  return (
    <div className="relative w-full overflow-auto rounded-lg border border-border bg-card">
      <table className={`w-full caption-bottom text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className = '', ...props }) => {
  return (
    <thead className={`border-b border-border bg-muted/50 [&_tr]:border-b ${className}`} {...props}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className = '', ...props }) => {
  return (
    <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props}>
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ children, className = '', ...props }) => {
  return (
    <tr className={`border-b border-border transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted ${className}`} {...props}>
      {children}
    </tr>
  );
};

export const TableHead: React.FC<React.HTMLAttributes<HTMLTableCellElement>> = ({ children, className = '', ...props }) => {
  return (
    <th className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${className}`} {...props}>
      {children}
    </th>
  );
};

export const TableCell: React.FC<React.HTMLAttributes<HTMLTableCellElement>> = ({ children, className = '', ...props }) => {
  return (
    <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`} {...props}>
      {children}
    </td>
  );
};
