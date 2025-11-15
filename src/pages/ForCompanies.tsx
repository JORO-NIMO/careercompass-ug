import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building, Users, Target, Star } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ForCompanies = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [positionTitle, setPositionTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('');
  const [industry, setIndustry] = useState('');
  const [stipend, setStipend] = useState('');
  const [availableSlots, setAvailableSlots] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to post placements",
      });
      navigate('/signin');
    } else if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can post placements",
        variant: "destructive",
      });
    }
  }, [user, isAdmin, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin) {
      toast({
        title: "Error",
        description: "You don't have permission to post placements",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      const { error } = await supabase.from('placements').insert({
        position_title: positionTitle,
        company_name: companyName,
        description,
        region,
        industry,
        stipend,
        available_slots: parseInt(availableSlots),
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Placement posted successfully",
      });

      // Reset form
      setPositionTitle('');
      setCompanyName('');
      setDescription('');
      setRegion('');
      setIndustry('');
      setStipend('');
      setAvailableSlots('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post placement",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary via-primary-glow to-primary-dark text-primary-foreground">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold">
                Find Top Talent for Your Company
              </h1>
              <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
                Connect with motivated students across Uganda and build your future workforce
              </p>
              <Button size="lg" variant="secondary" className="mt-8">
                Post Your First Placement
              </Button>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose PlacementsBridge?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Users className="w-12 h-12 text-primary mb-4" />
                  <CardTitle>Access Top Students</CardTitle>
                </CardHeader>
                <CardContent>
                  Connect with pre-screened students from universities across Uganda
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Target className="w-12 h-12 text-primary mb-4" />
                  <CardTitle>Targeted Matching</CardTitle>
                </CardHeader>
                <CardContent>
                  Our smart matching system connects you with students who fit your requirements
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Star className="w-12 h-12 text-primary mb-4" />
                  <CardTitle>Easy Management</CardTitle>
                </CardHeader>
                <CardContent>
                  Simple dashboard to manage applications and communicate with candidates
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Post Placement Form */}
        <section className="py-16 bg-secondary/20">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-8">Post a Placement</h2>
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Position Title</Label>
                      <Input id="title" placeholder="e.g. Software Engineer Intern" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company Name</Label>
                      <Input id="company" placeholder="Your company name" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Describe the role and responsibilities..." rows={4} />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Region</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="central">Central Region</SelectItem>
                          <SelectItem value="eastern">Eastern Region</SelectItem>
                          <SelectItem value="northern">Northern Region</SelectItem>
                          <SelectItem value="western">Western Region</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="agriculture">Agriculture</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stipend">Stipend (Optional)</Label>
                      <Input id="stipend" placeholder="e.g. 500,000 UGX/month" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slots">Available Slots</Label>
                      <Input id="slots" type="number" placeholder="e.g. 5" />
                    </div>
                  </div>
                  
                  <Button className="w-full" size="lg">
                    Post Placement
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ForCompanies;