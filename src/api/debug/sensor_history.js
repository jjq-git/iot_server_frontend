/**
 * 调试 - 传感器历史数据 CSV 导出辅助
 *
 * 数据请求复用 [src/api/pods.js] 的 fetchPodRecords(unitId, params),
 * 路径:GET /api/v1/pods/{uuid}/records
 *
 * 本文件只负责把已经拿到的 records 转成 CSV 并触发浏览器下载。
 */

/**
 * 从 records 数组生成 CSV 文本
 * @param {Array<Object>} records 记录数组,每条对象的 key 作为列
 * @param {Array<string>} [columns] 显式列顺序;不传则用第一条记录的 key
 * @returns {string}
 */
export function recordsToCsv (records, columns) {
  if (!records || records.length === 0) return ''
  const cols = columns && columns.length ? columns : Object.keys(records[0])
  const escape = v => {
    if (v === null || v === undefined) return ''
    const str = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  const lines = [cols.join(',')]
  for (const row of records) {
    lines.push(cols.map(c => escape(row[c])).join(','))
  }
  return lines.join('\n')
}

/**
 * 触发浏览器下载 CSV 文件
 * @param {string} csv  CSV 文本
 * @param {string} filename 下载文件名
 */
export function downloadCsv (csv, filename = 'records.csv') {
  // 加 BOM 以便 Excel 正确识别 UTF-8
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
