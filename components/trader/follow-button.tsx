'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Wallet, Check, Loader2, X, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const MARKET_CATEGORIES = [
  'Crypto',
  'Culture',
  'Earnings',
  'Economy',
  'Elections',
  'Geopolitics',
  'Mentions',
  'Politics',
  'Sports',
  'Tech',
  'Trump',
  'World',
] as const

interface FollowButtonProps {
  traderAddress: string
  traderName?: string
  variant?: 'follow' | 'track' | 'both'
  className?: string
  compact?: boolean
  showLogo?: boolean
  userId?: string | null
  initialFollowed?: boolean
  initialTracked?: boolean
}

export function FollowButton({
  traderAddress,
  traderName,
  variant = 'both',
  className,
  compact = false,
  showLogo: _showLogo = false,
  userId: externalUserId,
  initialFollowed,
  initialTracked,
}: FollowButtonProps) {
  const router = useRouter()
  const supabase = createClient()

  const [currentUserId, setCurrentUserId] = useState<string | null>(externalUserId ?? null)
  const [isFollowed, setIsFollowed] = useState(initialFollowed ?? false)
  const [isTracked, setIsTracked] = useState(initialTracked ?? false)
  const [loadingFollow, setLoadingFollow] = useState(false)
  const [loadingTrack, setLoadingTrack] = useState(false)
  const [initialLoading, setInitialLoading] = useState(!externalUserId)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [allCategories, setAllCategories] = useState(false)
  const [savingCategories, setSavingCategories] = useState(false)

  useEffect(() => {
    if (externalUserId !== undefined) {
      setCurrentUserId(externalUserId ?? null)
      if (initialFollowed !== undefined) setIsFollowed(initialFollowed)
      if (initialTracked !== undefined) setIsTracked(initialTracked)
      setInitialLoading(false)
      return
    }
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setInitialLoading(false)
        return
      }
      setCurrentUserId(user.id)

      const { data: followData } = await supabase
        .from('followed_traders')
        .select('id, categories')
        .eq('user_id', user.id)
        .eq('trader_address', traderAddress)
        .maybeSingle()

      if (followData) {
        setIsFollowed(true)
        if (followData.categories && followData.categories.length > 0) {
          setSelectedCategories(followData.categories)
          if (followData.categories.length === MARKET_CATEGORIES.length) {
            setAllCategories(true)
          }
        }
      }

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
  }, [traderAddress, externalUserId, initialFollowed, initialTracked])

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories(prev => {
      const next = prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
      setAllCategories(next.length === MARKET_CATEGORIES.length)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (allCategories) {
      setSelectedCategories([])
      setAllCategories(false)
    } else {
      setSelectedCategories([...MARKET_CATEGORIES])
      setAllCategories(true)
    }
  }, [allCategories])

  const openFollowModal = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!currentUserId) {
      router.push('/auth/login')
      return
    }
    if (isFollowed) {
      // Unfollow directly
      handleUnfollow()
      return
    }
    // Open modal for new follow
    setSelectedCategories([...MARKET_CATEGORIES])
    setAllCategories(true)
    setShowModal(true)
  }

  const handleUnfollow = async () => {
    if (!currentUserId) return
    setLoadingFollow(true)
    await supabase
      .from('followed_traders')
      .delete()
      .eq('user_id', currentUserId)
      .eq('trader_address', traderAddress)
    setIsFollowed(false)
    setSelectedCategories([])
    setAllCategories(false)
    setLoadingFollow(false)
  }

  const handleFollowWithCategories = async () => {
    if (!currentUserId) return
    setSavingCategories(true)

    const cats = allCategories ? [...MARKET_CATEGORIES] : selectedCategories

    await supabase
      .from('followed_traders')
      .upsert({
        user_id: currentUserId,
        trader_address: traderAddress,
        trader_name: traderName || null,
        categories: cats,
      }, { onConflict: 'user_id,trader_address' })

    // Also add to tracked_wallets for notifications
    await supabase
      .from('tracked_wallets')
      .upsert({
        user_id: currentUserId,
        wallet_address: traderAddress,
        label: traderName || null,
        alerts_enabled: true,
      }, { onConflict: 'user_id,wallet_address' })

    setIsFollowed(true)
    setIsTracked(true)
    setSavingCategories(false)
    setShowModal(false)
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
  const displayName = traderName || `${traderAddress.slice(0, 6)}...${traderAddress.slice(-4)}`

  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        {(variant === 'follow' || variant === 'both') && (
          <Button
            onClick={openFollowModal}
            disabled={loadingFollow || initialLoading}
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
            disabled={loadingTrack || initialLoading}
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

      {/* Category Selection Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); setShowModal(false) }}
        >
          <div
            className="relative w-full max-w-md mx-4 bg-card border border-border rounded-xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-5 w-5 text-foreground" />
              <h3 className="text-lg font-semibold text-foreground">
                {'Follow ' + displayName}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              {'Select which categories you want to receive notifications for. You will get Telegram alerts when ' + displayName + ' makes trades.'}
            </p>

            {/* Follow all categories */}
            <button
              onClick={toggleAll}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-4 transition-all border',
                allCategories
                  ? 'bg-[#6b7a2f]/20 border-[#6b7a2f]/50 text-foreground'
                  : 'bg-secondary/30 border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
              )}
            >
              <div className={cn(
                'h-5 w-5 rounded flex items-center justify-center border-2 transition-all shrink-0',
                allCategories
                  ? 'bg-[#6b7a2f] border-[#6b7a2f]'
                  : 'border-muted-foreground/40'
              )}>
                {allCategories && <Check className="h-3.5 w-3.5 text-white" />}
              </div>
              <span className="font-medium text-sm">Follow all categories</span>
            </button>

            {/* Category label */}
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-medium">
              Or select specific categories:
            </p>

            {/* Category grid */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {MARKET_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat)
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      'px-3 py-2.5 rounded-lg text-sm font-medium transition-all border text-center',
                      isSelected
                        ? 'bg-[#6b7a2f]/20 border-[#6b7a2f]/50 text-foreground'
                        : 'bg-secondary/30 border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
                    )}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleFollowWithCategories}
                disabled={savingCategories || selectedCategories.length === 0}
                className="gap-2 bg-foreground text-background hover:bg-foreground/90 rounded-lg"
              >
                {savingCategories ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                Follow
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
