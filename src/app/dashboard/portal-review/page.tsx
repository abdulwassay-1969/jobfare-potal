'use client';

import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { PortalReview } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

function StarRating({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const [hovered, setHovered] = useState(0);
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 disabled:cursor-not-allowed"
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                star <= (hovered || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
        {(hovered || value) > 0 && (
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            {labels[hovered || value]}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PortalReviewPage() {
  const db = useFirestore();
  const { user, profileName } = useAuth();
  const { toast } = useToast();

  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existing, setExisting] = useState<PortalReview | null>(null);

  useEffect(() => {
    if (!db || !user) return;
    const ref = doc(db, 'portalReviews', user.uid);
    getDoc(ref).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as PortalReview;
        setExisting(data);
        setRating(data.rating);
        setFeedback(data.feedback);
        setSuggestions(data.suggestions || '');
      }
    }).finally(() => setChecking(false));
  }, [db, user]);

  const handleSubmit = async () => {
    if (!db || !user) return;
    if (rating === 0) {
      toast({ title: 'Please select a rating', variant: 'destructive' });
      return;
    }
    if (feedback.trim().length < 10) {
      toast({ title: 'Feedback too short', description: 'Please write at least a sentence.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const reviewData = {
        id: user.uid,
        companyId: user.uid,
        companyName: profileName || 'Unknown Company',
        rating,
        feedback: feedback.trim(),
        suggestions: suggestions.trim(),
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'portalReviews', user.uid), reviewData);
      setExisting(reviewData as unknown as PortalReview);
      toast({
        title: existing ? 'Review Updated' : 'Thank you for your feedback!',
        description: 'Your review helps us improve the portal for future job fairs.',
      });
    } catch {
      toast({ title: 'Failed to submit', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/companies">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Rate This Portal</h1>
          <p className="text-muted-foreground text-sm">Your feedback helps us improve for future job fairs.</p>
        </div>
      </div>

      {existing && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">You have already submitted a review. You can update it below.</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Overall Experience</CardTitle>
          <CardDescription>How would you rate the C@SE Job Fair web portal overall?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="font-semibold">Your Rating <span className="text-destructive">*</span></Label>
            <StarRating value={rating} onChange={setRating} disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback" className="font-semibold">
              What did you think? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="feedback"
              placeholder="Share your overall experience — what worked well, what was easy or difficult..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={loading}
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggestions" className="font-semibold">
              Suggestions for improvement <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="suggestions"
              placeholder="Any specific features you'd like to see, or things that could be done better next time..."
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              disabled={loading}
              className="min-h-[100px]"
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading || rating === 0} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {existing ? 'Update Review' : 'Submit Review'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
