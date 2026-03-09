import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';

export function useFollow(targetUserId: string, initialIsFollowing: boolean = false) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  // On mount, check if actually following (if user is logged in) unless we are sure
  useEffect(() => {
    const checkStatus = async () => {
      if (!user || !targetUserId || initialIsFollowing) return; 

      try {
        const { data, error } = await supabase
          .from('followers')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .maybeSingle();
        
        if (data) setIsFollowing(true);
      } catch (err) {
        console.error("Error checking follow status:", err);
      }
    };

    checkStatus();
  }, [user, targetUserId, initialIsFollowing]);

  const toggleFollow = async () => {
    if (!user) {
      showToast("Please login to follow creators");
      return;
    }
    
    if (user.id === targetUserId) {
      showToast("You cannot follow yourself");
      return;
    }

    const previousState = isFollowing;
    setIsFollowing(!previousState); // Optimistic update
    setIsLoading(true);

    try {
      if (previousState) {
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

        // Create notification
        await supabase
          .from('notifications')
          .insert({
            recipient_profile_id: targetUserId,
            notification_type: 'new_follower',
            notification_message: 'started following you',
            notification_link: `/profile/${user.id}`
          });
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
      setIsFollowing(previousState); // Revert on failure
      showToast("Failed to update follow status");
    } finally {
      setIsLoading(false);
    }
  };

  return { isFollowing, toggleFollow, isLoading };
}
