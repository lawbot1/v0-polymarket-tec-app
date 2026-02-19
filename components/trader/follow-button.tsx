'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Star, Wallet, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FollowButtonProps {
  traderAddress: string
  traderName?: string
  variant?: 'follow' | 'track' | 'both'
  className?: string
  compact?: boolean
}

export function FollowButton({ traderAddress, traderName, variant = 'both', className, compact = false }: FollowButtonProps) {
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [isFollowed, setIsFollowed] = useState(false)
  const [isTracked, setIsTracked] = useState(false)
  const [loadingFollow, setLoadingFollow] = useState(false)
  const [loadingTrack, setLoadingTrack] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setInitialLoading(false)
        return
      }
      setUserId(user.id)

      // Check follow status
      if (variant === 'follow' || variant === 'both') {
        const { data: followed } = await supabase
          .from('followed_traders')
          .select('id')
          .eq('user_id', user.id)
          .eq('trader_address', traderAddress)
          .maybeSingle()
        setIsFollowed(!!followed)
      }

      // Check track status
      if (variant === 'track' || variant === 'both') {
        const { data: tracked } = await supabase
          .from('tracked_wallets')
          .select('id')
          .eq('user_id', user.id)
          .eq('wallet_address', traderAddress)
          .maybeSingle()
        setIsTracked(!!tracked)
      }

      setInitialLoading(false)
    }
    checkStatus()
  }, [traderAddress])

  const handleFollow = async () => {
    if (!userId) {
      router.push('/auth/login')
      return
    }
    setLoadingFollow(true)

    if (isFollowed) {
      await supabase
        .from('followed_traders')
        .delete()
        .eq('user_id', userId)
        .eq('trader_address', traderAddress)
      setIsFollowed(false)
    } else {
      await supabase
        .from('followed_traders')
        .insert({
          user_id: userId,
          trader_address: traderAddress,
          trader_name: traderName || null,
        })
      setIsFollowed(true)
    }
    setLoadingFollow(false)
  }

  const handleTrack = async () => {
    if (!userId) {
      router.push('/auth/login')
      return
    }
    setLoadingTrack(true)

    if (isTracked) {
      await supabase
        .from('tracked_wallets')
        .delete()
        .eq('user_id', userId)
        .eq('wallet_address', traderAddress)
      setIsTracked(false)
    } else {
      await supabase
        .from('tracked_wallets')
        .insert({
          user_id: userId,
          wallet_address: traderAddress,
          label: traderName || null,
          alerts_enabled: true,
        })
      setIsTracked(true)
    }
    setLoadingTrack(false)
  }

  if (initialLoading) {
    return <div className={cn('h-10 bg-secondary/30 animate-pulse', className)} />
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {(variant === 'follow' || variant === 'both') && (
        <Button
          onClick={(e) => { e.stopPropagation(); handleFollow() }}
          disabled={loadingFollow}
          variant={isFollowed ? 'outline' : 'default'}
          size={compact ? 'sm' : 'default'}
          className={cn(
            'gap-1.5 transition-all',
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
            <Star className="h-3.5 w-3.5" />
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
            'gap-1.5 transition-all border-border',
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
