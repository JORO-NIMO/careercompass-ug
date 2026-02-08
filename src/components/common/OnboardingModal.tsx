/**
 * Onboarding Modal
 * 3-step onboarding flow for new users
 * Step 1: Career Level
 * Step 2: Interests (opportunity types & fields)
 * Step 3: Notification Preferences
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  GraduationCap,
  Briefcase,
  Award,
  DollarSign,
  BookOpen,
  Building2,
  Bell,
  Mail,
  Smartphone,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface OnboardingData {
  careerLevel: string;
  opportunityTypes: string[];
  areasOfInterest: string[];
  notificationEmail: boolean;
  notificationPush: boolean;
}

const CAREER_LEVELS = [
  { id: 'student', label: 'Student', description: 'Currently studying or recent graduate', icon: GraduationCap },
  { id: 'entry', label: 'Entry Level', description: '0-2 years of experience', icon: Briefcase },
  { id: 'mid', label: 'Mid Level', description: '3-5 years of experience', icon: Award },
  { id: 'senior', label: 'Senior Level', description: '6+ years of experience', icon: Building2 },
  { id: 'other', label: 'Other', description: 'Career changer or other', icon: Sparkles },
];

const OPPORTUNITY_TYPES = [
  { id: 'scholarship', label: 'Scholarships', description: 'Funding for education', icon: GraduationCap },
  { id: 'fellowship', label: 'Fellowships', description: 'Research & professional programs', icon: Award },
  { id: 'internship', label: 'Internships', description: 'Work experience programs', icon: Briefcase },
  { id: 'job', label: 'Jobs', description: 'Full-time positions', icon: Building2 },
  { id: 'training', label: 'Training', description: 'Skills & development programs', icon: BookOpen },
  { id: 'grant', label: 'Grants', description: 'Project & research funding', icon: DollarSign },
];

const AREAS_OF_INTEREST = [
  'ICT / Technology',
  'Business & Finance',
  'Engineering',
  'Health & Medicine',
  'Education',
  'Development / NGO',
  'Agriculture',
  'Arts & Media',
  'Law & Governance',
  'Science & Research',
];

export function OnboardingModal({ isOpen, onClose, userId }: OnboardingModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    careerLevel: '',
    opportunityTypes: [],
    areasOfInterest: [],
    notificationEmail: true,
    notificationPush: true,
  });

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.careerLevel !== '';
      case 2:
        return data.opportunityTypes.length > 0;
      case 3:
        return true; // Notification preferences are optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc('complete_onboarding', {
        p_user_id: userId,
        p_career_level: data.careerLevel,
        p_opportunity_types: data.opportunityTypes,
        p_countries: null, // Could add in future
        p_areas_of_interest: data.areasOfInterest,
        p_notification_email: data.notificationEmail,
        p_notification_push: data.notificationPush,
      });

      if (error) throw error;

      toast({
        title: 'Welcome to CareerCompass!',
        description: 'Your preferences have been saved. Enjoy personalized recommendations!',
      });

      onClose();
    } catch (err) {
      console.error('Onboarding error:', err);
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleOpportunityType = (typeId: string) => {
    setData((prev) => ({
      ...prev,
      opportunityTypes: prev.opportunityTypes.includes(typeId)
        ? prev.opportunityTypes.filter((t) => t !== typeId)
        : [...prev.opportunityTypes, typeId],
    }));
  };

  const toggleAreaOfInterest = (area: string) => {
    setData((prev) => ({
      ...prev,
      areasOfInterest: prev.areasOfInterest.includes(area)
        ? prev.areasOfInterest.filter((a) => a !== area)
        : [...prev.areasOfInterest, area],
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === 1 && 'Welcome! Tell us about yourself'}
            {step === 2 && "What opportunities interest you?"}
            {step === 3 && 'Stay updated'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Help us personalize your experience'}
            {step === 2 && 'Select all that apply'}
            {step === 3 && 'Choose how you want to receive notifications'}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-1 text-center">
            Step {step} of {totalSteps}
          </p>
        </div>

        {/* Step 1: Career Level */}
        {step === 1 && (
          <div className="space-y-3">
            <RadioGroup
              value={data.careerLevel}
              onValueChange={(value) => setData((prev) => ({ ...prev, careerLevel: value }))}
            >
              {CAREER_LEVELS.map(({ id, label, description, icon: Icon }) => (
                <div
                  key={id}
                  className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    data.careerLevel === id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setData((prev) => ({ ...prev, careerLevel: id }))}
                >
                  <RadioGroupItem value={id} id={id} />
                  <Icon className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <Label htmlFor={id} className="font-medium cursor-pointer">
                      {label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Opportunity Types</h4>
              <div className="grid grid-cols-2 gap-2">
                {OPPORTUNITY_TYPES.map(({ id, label, icon: Icon }) => (
                  <div
                    key={id}
                    className={`flex items-center space-x-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                      data.opportunityTypes.includes(id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleOpportunityType(id)}
                  >
                    <Checkbox
                      checked={data.opportunityTypes.includes(id)}
                      onCheckedChange={() => toggleOpportunityType(id)}
                    />
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Areas of Interest (optional)</h4>
              <div className="flex flex-wrap gap-2">
                {AREAS_OF_INTEREST.map((area) => (
                  <button
                    key={area}
                    type="button"
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      data.areasOfInterest.includes(area)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleAreaOfInterest(area)}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Notifications */}
        {step === 3 && (
          <div className="space-y-4">
            <div
              className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                data.notificationEmail ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => setData((prev) => ({ ...prev, notificationEmail: !prev.notificationEmail }))}
            >
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Get weekly digest of new opportunities
                  </p>
                </div>
              </div>
              <Checkbox
                checked={data.notificationEmail}
                onCheckedChange={(checked) =>
                  setData((prev) => ({ ...prev, notificationEmail: checked === true }))
                }
              />
            </div>

            <div
              className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                data.notificationPush ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => setData((prev) => ({ ...prev, notificationPush: !prev.notificationPush }))}
            >
              <div className="flex items-center space-x-3">
                <Smartphone className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Get instant alerts for matching opportunities
                  </p>
                </div>
              </div>
              <Checkbox
                checked={data.notificationPush}
                onCheckedChange={(checked) =>
                  setData((prev) => ({ ...prev, notificationPush: checked === true }))
                }
              />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start space-x-2">
                <Bell className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">You can change these anytime</p>
                  <p className="text-sm text-muted-foreground">
                    Visit Settings {'>'} Notifications to update your preferences
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack} disabled={loading}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          ) : (
            <div />
          )}

          <Button onClick={handleNext} disabled={!canProceed() || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {step === totalSteps ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Complete
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default OnboardingModal;
