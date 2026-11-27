/**
 * Experiments shown in the drawer. Edit this list to add your own projects.
 * Use `href: '#'` for projects that are not published yet; they render as "Sắp có".
 */
export type ProjectStatus = 'live' | 'wip' | 'idea'

export interface Project {
  title: string
  tag: string
  description: string
  status: ProjectStatus
  href: string
}

export const projects: Project[] = [
  {
    title: 'Polygon Pals',
    tag: 'SVG · Vật lý',
    description: 'Một bầy đa giác biết ghen tị, giận dỗi và làm lành.',
    status: 'wip',
    href: '#',
  },
  {
    title: 'Night Radio',
    tag: 'Âm thanh web',
    description: 'Đài phát thanh lúc nửa đêm, âm thanh tổng hợp toàn bằng toán.',
    status: 'idea',
    href: '#',
  },
  {
    title: 'Pixel Diary',
    tag: 'Vẽ canvas',
    description: 'Mỗi ngày một khung pixel 16×16. Không chữ, chỉ màu.',
    status: 'live',
    href: '#',
  },
  {
    title: 'Tiny Weather',
    tag: 'API · Ứng dụng mini',
    description: 'Dự báo thời tiết kể bằng biểu cảm của Gon.',
    status: 'wip',
    href: '#',
  },
]

export const statusLabel: Record<ProjectStatus, string> = {
  live: 'Đang chạy',
  wip: 'Đang vọc',
  idea: 'Ý tưởng',
}
