/**
 * Notification Center Component
 * Task 5.4: Add real-time notifications for session events
 */

'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  Settings,
  CheckCircle,
  Clock,
  Lock,
  Unlock,
  AlertTriangle,
  Wifi,
  WifiOff,
  MoreVertical,
  Trash2,
  MarkAsRead
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useRealtimeNotifications,
  useNotificationSettings,
  useNotificationHistory,
  useConnectionStatus,
  type NotificationEvent
} from './realtime-notification-provider'

interface NotificationCenterProps {
  className?: string
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export function NotificationCenter({
  className,
  position = 'top-right'
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  const { unreadCount } = useRealtimeNotifications()
  const { isConnected } = useConnectionStatus()
  const { settings, updateSettings } = useNotificationSettings()
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications
  } = useNotificationHistory()

  const getNotificationIcon = (type: NotificationEvent['type']) => {
    switch (type) {
      case 'aula_opened':
        return <Unlock className="h-4 w-4 text-green-600" />
      case 'aula_closed':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'aula_locked':
        return <Lock className="h-4 w-4 text-red-600" />
      case 'time_warning':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'connection_issue':
        return isConnected ?
          <Wifi className="h-4 w-4 text-green-600" /> :
          <WifiOff className="h-4 w-4 text-red-600" />
      case 'compliance_alert':
        return <AlertTriangle className="h-4 w-4 text-purple-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const getSeverityColor = (severity: NotificationEvent['severity']) => {
    switch (severity) {
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'warning':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200'
      default:
        return 'text-blue-700 bg-blue-50 border-blue-200'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    switch (activeTab) {
      case 'unread':
        return !notification.read
      case 'aula':
        return ['aula_opened', 'aula_closed', 'aula_locked'].includes(notification.type)
      case 'time':
        return notification.type === 'time_warning'
      case 'system':
        return ['connection_issue', 'compliance_alert'].includes(notification.type)
      default:
        return true
    }
  })

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - timestamp.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'Agora'
    if (diffMinutes < 60) return `${diffMinutes}min atrás`
    if (diffHours < 24) return `${diffHours}h atrás`
    if (diffDays < 7) return `${diffDays}d atrás`

    return timestamp.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const NotificationItem = ({ notification }: { notification: NotificationEvent }) => (
    <div
      className={cn(
        'p-3 border rounded-lg transition-all cursor-pointer hover:shadow-sm',
        getSeverityColor(notification.severity),
        notification.read ? 'opacity-60' : 'opacity-100'
      )}
      onClick={() => !notification.read && markAsRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm truncate">
              {notification.title}
            </h4>
            <div className="flex items-center gap-2">
              {notification.persistent && (
                <Badge variant="outline" className="text-xs">
                  Importante
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!notification.read && (
                    <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                      <MarkAsRead className="h-4 w-4 mr-2" />
                      Marcar como lida
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => clearNotification(notification.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
            {notification.message}
          </p>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {formatTimestamp(notification.timestamp)}
            </span>

            {notification.turmaId && (
              <Badge variant="secondary" className="text-xs">
                {notification.turmaId}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const SettingsPanel = () => (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Eventos de Aula</label>
          <Switch
            checked={settings.enableAulaEvents}
            onCheckedChange={(checked) =>
              updateSettings({ enableAulaEvents: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Avisos de Tempo</label>
          <Switch
            checked={settings.enableTimeWarnings}
            onCheckedChange={(checked) =>
              updateSettings({ enableTimeWarnings: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Alertas de Conexão</label>
          <Switch
            checked={settings.enableConnectionAlerts}
            onCheckedChange={(checked) =>
              updateSettings({ enableConnectionAlerts: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Alertas de Conformidade</label>
          <Switch
            checked={settings.enableComplianceAlerts}
            onCheckedChange={(checked) =>
              updateSettings({ enableComplianceAlerts: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Som Habilitado</label>
          <Switch
            checked={settings.soundEnabled}
            onCheckedChange={(checked) =>
              updateSettings({ soundEnabled: checked })
            }
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={markAllAsRead}
          className="w-full"
          disabled={notifications.filter(n => !n.read).length === 0}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Marcar todas como lidas
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={clearAllNotifications}
          className="w-full text-red-600 hover:text-red-700"
          disabled={notifications.length === 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Limpar todas
        </Button>
      </div>
    </div>
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('relative p-2', className)}
          aria-label={`Notificações ${unreadCount > 0 ? `(${unreadCount} não lidas)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <div className={cn(
            'absolute -bottom-1 -right-1 h-2 w-2 rounded-full',
            isConnected ? 'bg-green-500' : 'bg-red-500'
          )} />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-96 p-0"
        align={position.includes('right') ? 'end' : 'start'}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Notificações</h3>
            <div className="flex items-center gap-2">
              <div className={cn(
                'h-2 w-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-red-500'
              )} />
              <span className="text-xs text-gray-500">
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 m-2">
            <TabsTrigger value="all" className="text-xs">
              Todas
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Não lidas
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="aula" className="text-xs">Aula</TabsTrigger>
            <TabsTrigger value="time" className="text-xs">Tempo</TabsTrigger>
            <TabsTrigger value="system" className="text-xs">Sistema</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {activeTab === 'settings' ? (
              <div className="p-4">
                <SettingsPanel />
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="p-4 space-y-3">
                  {filteredNotifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma notificação</p>
                    </div>
                  ) : (
                    filteredNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <div className="p-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(activeTab === 'settings' ? 'all' : 'settings')}
            className="w-full"
          >
            <Settings className="h-4 w-4 mr-2" />
            {activeTab === 'settings' ? 'Voltar' : 'Configurações'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default NotificationCenter