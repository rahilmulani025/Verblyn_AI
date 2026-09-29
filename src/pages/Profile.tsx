import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  User, Briefcase, GraduationCap, Phone, Save, ArrowLeft, 
  Mail, Calendar, Trophy, Flame, Target, LogOut, Edit2, X, Check
} from "lucide-react";

interface ProfileData {
  full_name: string;
  profession: string;
  institution: string;
  contact_phone: string;
  avatar_url: string;
  created_at: string;
}

interface UserProgress {
  total_sessions: number;
  current_streak: number;
  avg_grammar_score: number;
  avg_fluency_score: number;
  avg_vocabulary_score: number;
  avg_confidence_score: number;
}

const Profile = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    profession: "",
    institution: "",
    contact_phone: "",
    avatar_url: "",
    created_at: "",
  });
  const [editProfile, setEditProfile] = useState<ProfileData>(profile);
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, profession, institution, contact_phone, avatar_url, created_at")
          .eq("user_id", user.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          // Only log in development
          if (import.meta.env.DEV) {
            console.error("Error fetching profile:", profileError);
          }
        }

        if (profileData) {
          const profileInfo = {
            full_name: profileData.full_name || "",
            profession: profileData.profession || "",
            institution: profileData.institution || "",
            contact_phone: profileData.contact_phone || "",
            avatar_url: profileData.avatar_url || "",
            created_at: profileData.created_at || "",
          };
          setProfile(profileInfo);
          setEditProfile(profileInfo);
        }

        // Fetch progress
        const { data: progressData } = await supabase
          .from("user_progress")
          .select("total_sessions, current_streak, avg_grammar_score, avg_fluency_score, avg_vocabulary_score, avg_confidence_score")
          .eq("user_id", user.id)
          .single();

        if (progressData) {
          setProgress(progressData);
        }
      } catch (error) {
        // Only log in development
        if (import.meta.env.DEV) {
          console.error("Error:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (!editProfile.full_name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (editProfile.full_name.length > 100) {
      toast.error("Name must be less than 100 characters");
      return;
    }

    if (editProfile.institution && editProfile.institution.length > 200) {
      toast.error("Institution name must be less than 200 characters");
      return;
    }

    if (editProfile.contact_phone && !/^[\d\s\-+()]*$/.test(editProfile.contact_phone)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editProfile.full_name.trim(),
          profession: editProfile.profession || null,
          institution: editProfile.institution?.trim() || null,
          contact_phone: editProfile.contact_phone?.trim() || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile(editProfile);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      // Only log in development
      if (import.meta.env.DEV) {
        console.error("Error updating profile:", error);
      }
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditProfile(profile);
    setIsEditing(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getProfessionLabel = (profession: string) => {
    const labels: Record<string, string> = {
      student: "Student",
      professional: "Working Professional",
      educator: "Educator / Teacher",
      entrepreneur: "Entrepreneur",
      freelancer: "Freelancer",
      other: "Other",
    };
    return labels[profession] || profession || "Not specified";
  };

  const getAverageScore = () => {
    if (!progress) return 0;
    const scores = [
      Number(progress.avg_grammar_score) || 0,
      Number(progress.avg_fluency_score) || 0,
      Number(progress.avg_vocabulary_score) || 0,
      Number(progress.avg_confidence_score) || 0,
    ];
    return Math.round(scores.reduce((a, b) => a + b, 0) / 4);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isStudent = editProfile.profession === "student";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-6 text-muted-foreground"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Column - Profile Card */}
            <div className="md:col-span-1 space-y-4">
              {/* Profile Overview Card */}
              <Card className="glass-card border-border/50 overflow-hidden">
                <div className="h-20 bg-gradient-to-r from-accent/30 to-accent/10" />
                <CardContent className="pt-0 -mt-10">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-accent/20 text-accent text-xl font-semibold">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <h2 className="mt-3 text-xl font-bold text-foreground">
                      {profile.full_name || "Add your name"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {getProfessionLabel(profile.profession)}
                    </p>
                    {profile.institution && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        {profile.institution}
                      </p>
                    )}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{user?.email}</span>
                    </div>
                    {profile.contact_phone && (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{profile.contact_phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {formatDate(profile.created_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Card */}
              <Card className="glass-card border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Your Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Flame className="w-4 h-4 text-orange-500" />
                      </div>
                      <span className="text-sm text-muted-foreground">Streak</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">{progress?.current_streak || 0} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-accent" />
                      </div>
                      <span className="text-sm text-muted-foreground">Sessions</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">{progress?.total_sessions || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Target className="w-4 h-4 text-green-500" />
                      </div>
                      <span className="text-sm text-muted-foreground">Avg Score</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">{getAverageScore()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Sign Out Button */}
              <Button 
                variant="outline" 
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>

            {/* Right Column - Edit Profile */}
            <div className="md:col-span-2">
              <Card className="glass-card border-border/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <User className="w-5 h-5 text-accent" />
                      Profile Settings
                    </CardTitle>
                    <CardDescription>
                      Manage your personal information
                    </CardDescription>
                  </div>
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={handleCancel}>
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <div className="w-4 h-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Full Name
                    </Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        placeholder="Enter your full name"
                        value={editProfile.full_name}
                        onChange={(e) => setEditProfile({ ...editProfile, full_name: e.target.value })}
                        maxLength={100}
                      />
                    ) : (
                      <p className="text-foreground py-2 px-3 bg-muted/20 rounded-md">
                        {profile.full_name || <span className="text-muted-foreground italic">Not set</span>}
                      </p>
                    )}
                  </div>

                  {/* Email (Read-only) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      Email Address
                    </Label>
                    <p className="text-foreground py-2 px-3 bg-muted/20 rounded-md">
                      {user?.email}
                    </p>
                  </div>

                  {/* Profession */}
                  <div className="space-y-2">
                    <Label htmlFor="profession" className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      Profession
                    </Label>
                    {isEditing ? (
                      <Select 
                        value={editProfile.profession} 
                        onValueChange={(value) => setEditProfile({ ...editProfile, profession: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your profession" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="professional">Working Professional</SelectItem>
                          <SelectItem value="educator">Educator / Teacher</SelectItem>
                          <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
                          <SelectItem value="freelancer">Freelancer</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-foreground py-2 px-3 bg-muted/20 rounded-md">
                        {getProfessionLabel(profile.profession)}
                      </p>
                    )}
                  </div>

                  {/* Institution (shown if student) */}
                  {(isEditing ? isStudent : profile.profession === "student") && (
                    <div className="space-y-2">
                      <Label htmlFor="institution" className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        School / College Name
                      </Label>
                      {isEditing ? (
                        <Input
                          id="institution"
                          placeholder="Enter your school or college name"
                          value={editProfile.institution}
                          onChange={(e) => setEditProfile({ ...editProfile, institution: e.target.value })}
                          maxLength={200}
                        />
                      ) : (
                        <p className="text-foreground py-2 px-3 bg-muted/20 rounded-md">
                          {profile.institution || <span className="text-muted-foreground italic">Not set</span>}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Contact Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      Contact Number
                    </Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={editProfile.contact_phone}
                        onChange={(e) => setEditProfile({ ...editProfile, contact_phone: e.target.value })}
                        maxLength={20}
                      />
                    ) : (
                      <p className="text-foreground py-2 px-3 bg-muted/20 rounded-md">
                        {profile.contact_phone || <span className="text-muted-foreground italic">Not set</span>}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
