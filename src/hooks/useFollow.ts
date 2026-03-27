import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';

export function useFollow(targetUserId: string, initialIsFollowing: boolean = false, initialFollowersCount: number = 0) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  // On mount, check if actually following (if user is logged in) and fetch current count
  useEffect(() => {
    const fetchStatusAndCount = async () => {
      if (!targetUserId) return;

      try {
        // Fetch follow status only if user is logged in
        if (user) {
          const { data, error } = await supabase
            .from('followers')
            .select('*')
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId)
            .maybeSingle();
          
          if (data) setIsFollowing(true);
        }

        // Always fetch the latest count
        const { count, error: countError } = await supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', targetUserId);
        
        if (!countError && count !== null) {
          setFollowersCount(count);
        }
      } catch (err) {
        console.error("Error in useFollow fetch:", err);
      }
    };

    fetchStatusAndCount();
  }, [user, targetUserId]);

  const toggleFollow = async () => {
    if (!user) {
      showToast("Please login to follow creators");
      return;
    }
    
    if (user.id === targetUserId) {
      showToast("You cannot follow yourself");
      return;
    }

    const previousStatus = isFollowing;
    const previousCount = followersCount;

    // Optimistic update
    setIsFollowing(!previousStatus);
    setFollowersCount(prev => previousStatus ? Math.max(0, prev - 1) : prev + 1);
    setIsLoading(true);

    try {
      if (previousStatus) {
        // Unfollow
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;
        showToast("Unfollowed successfully");
      } else {
        // Follow
        const { error } = await supabase
          .from('followers')
          .insert({ 
            follower_id: user.id, 
            following_id: targetUserId 
          });

        if (error) throw error;
        showToast("Started following!");

        // Create notification (non-breaking)
        supabase
          .from('notifications')
          .insert({
            recipient_profile_id: targetUserId,
            notification_type: 'new_follower',
            notification_message: 'started following you',
            notification_link: `/profile/${user.id}`
          })
          .then(({ error }) => {
            if (error) console.warn("Could not create notification:", error);
          });
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
      // Revert on failure
      setIsFollowing(previousStatus);
      setFollowersCount(previousCount);
      showToast("Failed to update follow status");
    } finally {
      setIsLoading(false);
    }
  };

  return { isFollowing, toggleFollow, isLoading, followersCount };
}

