import { useState, useEffect } from 'react'
import { Activity, Users, TrendingUp, Clock, Shield } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn, formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface AuditStatsProps {
  className?: string
}

interface StatsData {
  todayCount: number
  weekCount: number
  mostActiveUser: { name: string; count: number } | null
  actionTypeCounts: Record<string, number>
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: '#10B981', // emerald
  UPDATE: '#3B82F6', // blue
  DELETE: '#EF4444', // red
  LOGIN: '#8B5CF6',  // purple
  EXPORT: '#F59E0B', // amber
  OTHER: '#6B7280',  // gray
}

export function AuditStats({ className }: AuditStatsProps) {
  const [stats, setStats] = useState<StatsData>({
    todayCount: 0,
    weekCount: 0,
    mostActiveUser: null,
    actionTypeCounts: {},
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)

      // Get today's actions (using local timezone start of day)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { count: todayCount } = await supabase
        .from('activity_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString())

      // Get this week's actions
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const { count: weekCount } = await supabase
        .from('activity_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString())

      // Get most active user today
      const { data: userActivity } = await supabase
        .from('activity_log')
        .select('user_id, users(full_name)')
        .gte('created_at', todayStart.toISOString())

      const userCounts: Record<string, { name: string; count: number }> = {}
      userActivity?.forEach((log: any) => {
        const userId = log.user_id || 'anonymous'
        const userName = log.users?.full_name || 'System'
        if (userCounts[userId]) {
          userCounts[userId].count++
        } else {
          userCounts[userId] = { name: userName, count: 1 }
        }
      })

      const mostActiveUser = Object.values(userCounts).sort((a, b) => b.count - a.count)[0] || null

      // Get action type counts
      const { data: actionData } = await supabase
        .from('activity_log')
        .select('action')
        .gte('created_at', todayStart.toISOString())

      const actionCounts: Record<string, number> = {}
      actionData?.forEach((log: any) => {
        const action = log.action?.split('.')[0]?.toUpperCase() || 'OTHER'
        actionCounts[action] = (actionCounts[action] || 0) + 1
      })

      setStats({
        todayCount: todayCount || 0,
        weekCount: weekCount || 0,
        mostActiveUser,
        actionTypeCounts: actionCounts,
      })
    } catch (error) {
      console.error('Failed to load audit stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const pieData = Object.entries(stats.actionTypeCounts).map(([name, value]) => ({
    name,
    value,
    color: ACTION_COLORS[name] || ACTION_COLORS.OTHER,
  }))

  if (loading) {
    return (
      <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="glass-card p-4 animate-pulse">
            <div className="h-8 bg-dark-200 rounded w-16 mb-2" />
            <div className="h-4 bg-dark-200 rounded w-24" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {/* Today's Actions */}
      <Card className="glass-card p-4 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl" />
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Activity size={20} className="text-blue-400" />
          </div>
        </div>
        <p className="text-3xl font-bold text-white">{stats.todayCount}</p>
        <p className="text-xs text-gray-400 mt-1">Actions Today</p>
      </Card>

      {/* This Week */}
      <Card className="glass-card p-4 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl" />
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp size={20} className="text-emerald-400" />
          </div>
        </div>
        <p className="text-3xl font-bold text-white">{stats.weekCount}</p>
        <p className="text-xs text-gray-400 mt-1">This Week</p>
      </Card>

      {/* Most Active User */}
      <Card className="glass-card p-4 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl" />
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Users size={20} className="text-purple-400" />
          </div>
        </div>
        <p className="text-lg font-bold text-white truncate">
          {stats.mostActiveUser?.name || 'No Activity'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {stats.mostActiveUser ? `${stats.mostActiveUser.count} actions today` : 'Most Active User'}
        </p>
      </Card>

      {/* Action Types Pie Chart */}
      <Card className="glass-card p-4 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl" />
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Shield size={20} className="text-amber-400" />
          </div>
          <p className="text-[10px] text-gray-400 uppercase">Action Types</p>
        </div>
        
        {pieData.length > 0 ? (
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="100%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={25}
                  outerRadius={35}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151', 
                    borderRadius: '6px',
                    fontSize: '10px',
                  }}
                  itemStyle={{ color: '#F3F4F6' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-16 flex items-center justify-center">
            <p className="text-xs text-gray-500">No data</p>
          </div>
        )}
      </Card>
    </div>
  )
}
