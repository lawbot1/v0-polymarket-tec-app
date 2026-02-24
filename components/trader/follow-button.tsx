'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Wallet, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface FollowButtonProps {
  traderAddress: string
  traderName?: string
  variant?: 'follow' | 'track' | 'both'
  className?: string
  compact?: boolean
  showLogo?: boolean
}

export function FollowButton({
  traderAddress,
  traderName,
  variant = 'both',
  className,
  compact = false,
  showLogo: _showLogo = false,
}: FollowButtonProps) {
  const router = useRouter()
  const supabase = createClient()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isFollowed, setIsFollowed] = useState(false)
  const [isTracked, setIsTracked] = useState(false)
  const [loadingFollow, setLoadingFollow] = useState(false)
  const [loadingTrack, setLoadingTrack] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Fetch user session + check existing follow/track status on mount
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setInitialLoading(false)
        return
      }
      setCurrentUserId(user.id)

      // Check if already followed
      const { data: followData } = await supabase
        .from('followed_traders')
        .select('id')
        .eq('user_id', user.id)
        .eq('trader_address', traderAddress)
        .maybeSingle()

      if (followData) setIsFollowed(true)

      // Check if already tracked
      const { data: trackData } = await supabase
        .from('tracked_wallets')
        .select('id')
        .eq('user_id', user.id)
        .eq('wallet_address', traderAddress)
        .maybeSingle()

      if (trackData) setIsTracked(true)
      setInitialLoading(false)
    }
    init()
  }, [traderAddress])

  const handleFollow = async () => {
    if (!currentUserId) {
      router.push('/auth/login')
      return
    }
    setLoadingFollow(true)

    if (isFollowed) {
      await supabase
        .from('followed_traders')
        .delete()
        .eq('user_id', currentUserId)
        .eq('trader_address', traderAddress)
      setIsFollowed(false)
    } else {
      await supabase
        .from('followed_traders')
        .upsert({
          user_id: currentUserId,
          trader_address: traderAddress,
          trader_name: traderName || null,
        }, { onConflict: 'user_id,trader_address' })
      setIsFollowed(true)
    }
    setLoadingFollow(false)
  }

  const handleTrack = async () => {
    if (!currentUserId) {
      router.push('/auth/login')
      return
    }
    setLoadingTrack(true)

    if (isTracked) {
      await supabase
        .from('tracked_wallets')
        .delete()
        .eq('user_id', currentUserId)
        .eq('wallet_address', traderAddress)
      setIsTracked(false)
    } else {
      await supabase
        .from('tracked_wallets')
        .upsert({
          user_id: currentUserId,
          wallet_address: traderAddress,
          label: traderName || null,
          alerts_enabled: true,
        }, { onConflict: 'user_id,wallet_address' })
      setIsTracked(true)
    }
    setLoadingTrack(false)
  }

  const isSingleButton = variant === 'follow' || variant === 'track'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {(variant === 'follow' || variant === 'both') && (
        <Button
          onClick={(e) => { e.stopPropagation(); handleFollow() }}
          disabled={loadingFollow}
          variant={isFollowed ? 'outline' : 'default'}
          size={compact ? 'sm' : 'default'}
          className={cn(
            'gap-2 transition-all rounded-lg',
            isSingleButton && 'w-full',
            isFollowed
              ? 'border-[#22c55e]/50 text-[#22c55e] bg-[#22c55e]/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/50'
              : 'bg-foreground text-background hover:bg-foreground/90'
          )}
        >
          {loadingFollow ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isFollowed ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Image
              src="/vantake-logo-dark.png"
              alt=""
              width={28}
              height={28}
            />
          )}
          {!compact && (isFollowed ? 'Following' : 'Follow')}
        </Button>
      )}

      {(variant === 'track' || variant === 'both') && (
        <Button
          onClick={(e) => { e.stopPropagation(); handleTrack() }}
          disabled={loadingTrack}
          variant="outline"
          size={compact ? 'sm' : 'default'}
          className={cn(
            'gap-1.5 transition-all border-border rounded-lg',
            isSingleButton && 'w-full',
            isTracked
              ? 'border-[#22c55e]/50 text-[#22c55e] bg-[#22c55e]/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/50'
              : 'bg-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {loadingTrack ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isTracked ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Wallet className="h-3.5 w-3.5" />
          )}
          {!compact && (isTracked ? 'Tracked' : 'Track')}
        </Button>
      )}
    </div>
  )
}
