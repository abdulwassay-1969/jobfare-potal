'use client';

import { Bell, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

export function NotificationBell() {
    const { user } = useAuth();
    const db = useFirestore();

    const notificationsQuery = useMemoFirebase(() => {
        if (!user || !db) return null;
        return query(
            collection(db, 'userProfiles', user.uid, 'notifications'),
            orderBy('sentAt', 'desc'),
            limit(10)
        );
    }, [db, user]);

    const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

    const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

    const markAsRead = async (notificationId: string) => {
        if (!user || !db) return;
        const notifRef = doc(db, 'userProfiles', user.uid, 'notifications', notificationId);
        const dataToUpdate = { isRead: true };
        try {
            await updateDoc(notifRef, dataToUpdate);
        } catch (serverError) {
            const permissionError = new FirestorePermissionError({
              path: notifRef.path,
              operation: 'update',
              requestResourceData: dataToUpdate,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
                <div className="p-4 border-b">
                    <h4 className="font-medium leading-none">Notifications</h4>
                </div>
                <ScrollArea className="h-96">
                   {isLoading && <div className="p-4 space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>}
                   {!isLoading && notifications && notifications.length > 0 ? (
                       notifications.map(n => (
                           <Link
                                key={n.id}
                                href={n.targetUrl}
                                className={cn(
                                    "block p-4 border-l-4 transition-colors hover:bg-muted/50",
                                    n.isRead ? 'border-transparent text-muted-foreground' : 'border-primary'
                                )}
                                onClick={() => markAsRead(n.id)}
                            >
                                <p className={cn("font-semibold text-sm", !n.isRead && "text-foreground")}>{n.title}</p>
                                <p className="text-sm">{n.message}</p>
                                {n.sentAt && (
                                    <p className="text-xs mt-1">
                                        {formatDistanceToNow(n.sentAt.toDate(), { addSuffix: true })}
                                    </p>
                                )}
                           </Link>
                       ))
                   ) : (
                       !isLoading && <p className="p-8 text-sm text-muted-foreground text-center">You have no new notifications.</p>
                   )}
                </ScrollArea>
                <div className="p-2 border-t text-center">
                    <Button variant="link" size="sm" asChild>
                        <Link href="/dashboard/interviews">View All Interviews</Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
