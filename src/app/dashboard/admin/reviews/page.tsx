'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { PortalReview } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, MessageSquare, Lightbulb, TrendingUp, Loader2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-16 text-right text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-muted-foreground">{count}</span>
    </div>
  );
}

export default function AdminPortalReviewsPage() {
  const db = useFirestore();

  const reviewsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'portalReviews');
  }, [db]);

  const { data: reviews, isLoading } = useCollection<PortalReview>(reviewsQuery);

  const stats = useMemo(() => {
    if (!reviews || reviews.length === 0) return null;
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = sum / total;
    const dist = [1, 2, 3, 4, 5].map((s) => ({
      star: s,
      count: reviews.filter((r) => r.rating === s).length,
    }));
    return { total, avg, dist };
  }, [reviews]);

  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portal Reviews</h1>
        <p className="text-muted-foreground">Company feedback and ratings for the C@SE Job Fair portal.</p>
      </div>

      {/* Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Overall Rating</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-5xl font-bold text-yellow-400">{stats.avg.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground mt-1">out of 5</p>
                <div className="flex justify-center mt-2">
                  <StarDisplay rating={Math.round(stats.avg)} />
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                {[...stats.dist].reverse().map(({ star, count }) => (
                  <RatingBar key={star} label={`${star} star`} count={count} total={stats.total} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /> Response Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <p className="text-4xl font-bold">{stats.total}</p>
                <p className="text-muted-foreground mt-1">companies responded</p>
              </div>
              <div className="grid grid-cols-3 divide-x text-center text-sm">
                {[5, 4, 3].map((s) => (
                  <div key={s} className="px-2">
                    <p className="font-bold text-lg">{stats.dist.find(d => d.star === s)?.count ?? 0}</p>
                    <p className="text-muted-foreground">{labels[s]}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Individual reviews */}
      <div>
        <h2 className="text-lg font-semibold mb-3">All Reviews</h2>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && (!reviews || reviews.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <MessageSquare className="h-10 w-10" />
              <p className="font-medium">No reviews yet</p>
              <p className="text-sm">Reviews from companies will appear here after the job fair.</p>
            </CardContent>
          </Card>
        )}
        <div className="space-y-4">
          {reviews?.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{review.companyName?.charAt(0) ?? '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{review.companyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.createdAt instanceof Timestamp
                          ? review.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StarDisplay rating={review.rating} />
                    <span className="text-sm font-medium text-muted-foreground">{labels[review.rating]}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <MessageSquare className="h-3 w-3" /> Feedback
                  </p>
                  <p className="text-sm leading-relaxed">{review.feedback}</p>
                </div>

                {review.suggestions && (
                  <div className="space-y-1 p-3 rounded-md bg-muted/40 border border-border/50">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wide">
                      <Lightbulb className="h-3 w-3" /> Suggestions
                    </p>
                    <p className="text-sm leading-relaxed">{review.suggestions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
