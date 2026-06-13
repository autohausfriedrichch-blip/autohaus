'use client'

/**
 * MobileCardList – renders data as cards on mobile, table on desktop.
 *
 * Usage:
 *   <MobileCardList
 *     columns={[{ key:'name', label:'Name', primary:true }, { key:'status', label:'Status' }]}
 *     rows={data}
 *     onRowClick={row => ...}
 *   />
 */

interface Column {
  key: string
  label: string
  primary?: boolean   // shown as card title on mobile
  secondary?: boolean // shown as card subtitle on mobile
  hidden?: 'sm' | 'md' | 'lg' // hide below this breakpoint on desktop
  render?: (value: any, row: any) => React.ReactNode
}

interface Props {
  columns: Column[]
  rows: any[]
  onRowClick?: (row: any) => void
  emptyMessage?: string
  loading?: boolean
  actions?: (row: any) => React.ReactNode
}

export function MobileCardList({ columns, rows, onRowClick, emptyMessage = 'Nincs adat', loading, actions }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1,2,3].map(i => (
          <div key={i} className="h-16 bg-white rounded-[10px] animate-pulse border border-[rgba(0,0,0,0.06)]" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-[13px] text-[#888888]">{emptyMessage}</div>
    )
  }

  const primaryCol = columns.find(c => c.primary)
  const secondaryCol = columns.find(c => c.secondary)
  const otherCols = columns.filter(c => !c.primary && !c.secondary)

  return (
    <>
      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {rows.map((row, i) => (
          <div
            key={row.id ?? i}
            className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] p-3.5 card-touchable"
            onClick={() => onRowClick?.(row)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {primaryCol && (
                  <div className="font-semibold text-[13px] text-[#0D0D0D] truncate">
                    {primaryCol.render ? primaryCol.render(row[primaryCol.key], row) : row[primaryCol.key]}
                  </div>
                )}
                {secondaryCol && (
                  <div className="text-[12px] text-[#4a4a4a] mt-0.5 truncate">
                    {secondaryCol.render ? secondaryCol.render(row[secondaryCol.key], row) : row[secondaryCol.key]}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {otherCols.map(col => (
                    <span key={col.key} className="text-[11px] text-[#4a4a4a]">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </span>
                  ))}
                </div>
              </div>
              {actions && (
                <div className="shrink-0" onClick={e => e.stopPropagation()}>
                  {actions(row)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[rgba(0,0,0,0.10)]">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`text-left py-2 px-2 text-[#4a4a4a] font-semibold ${
                    col.hidden === 'sm' ? 'hidden sm:table-cell' :
                    col.hidden === 'md' ? 'hidden md:table-cell' :
                    col.hidden === 'lg' ? 'hidden lg:table-cell' : ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
              {actions && <th className="text-left py-2 px-2 text-[#4a4a4a] font-semibold">Műveletek</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id ?? i}
                className="border-b border-[rgba(0,0,0,0.05)] hover:bg-[#F4F5F7]/50 cursor-pointer transition-colors"
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={`py-2 px-2 ${
                      col.hidden === 'sm' ? 'hidden sm:table-cell' :
                      col.hidden === 'md' ? 'hidden md:table-cell' :
                      col.hidden === 'lg' ? 'hidden lg:table-cell' : ''
                    }`}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className="py-2 px-2" onClick={e => e.stopPropagation()}>
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
