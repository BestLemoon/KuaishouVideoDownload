export interface TableColumn {
  name?: string;
  title?: string;
  type?: string;
  options?: any[];
  className?: string;
  callback?: (item: any) => any;
  allowHtml?: boolean;
}

export interface Table {
  columns: TableColumn[];
  data: any[];
}
