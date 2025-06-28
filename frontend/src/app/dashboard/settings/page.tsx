'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useTheme } from '@/lib/hooks/useTheme'
import { 
  Link2,
  Globe,
  LogOut,
  Save,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const { theme, setTheme } = useTheme()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Redirect if not authenticated
  if (status === 'loading') {
    return <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
    </div>
  }

  if (status === 'unauthenticated') {
    redirect('/signin')
  }

  const handleSave = async () => {
    setSaving(true)
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto p-3 sm:p-0">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4 sm:space-y-6">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-0 w-full p-2 sm:p-1 h-auto">
          <TabsTrigger value="profile" className="text-xs sm:text-sm px-3 py-2.5 sm:py-1.5">Profile</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm px-3 py-2.5 sm:py-1.5">Notifications</TabsTrigger>
          <TabsTrigger value="security" className="text-xs sm:text-sm px-3 py-2.5 sm:py-1.5">Security</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs sm:text-sm px-3 py-2.5 sm:py-1.5">Billing</TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs sm:text-sm px-3 py-2.5 sm:py-1.5">Integrations</TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs sm:text-sm px-3 py-2.5 sm:py-1.5">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4 sm:space-y-6">
          <Card className="liquid-glass">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Profile Information</CardTitle>
              <CardDescription className="text-sm">Update your profile details and public information</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
              {/* Avatar */}
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback>
                    {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left">
                  <Button variant="outline" size="sm" className="text-sm">Change Avatar</Button>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">JPG, GIF or PNG. Max size of 2MB.</p>
                </div>
              </div>

              {/* Form */}
              <div className="grid gap-3 sm:gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-sm">First Name</Label>
                    <Input id="firstName" defaultValue={session?.user?.name?.split(' ')[0]} className="text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                    <Input id="lastName" defaultValue={session?.user?.name?.split(' ')[1]} className="text-sm" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <Input id="email" type="email" defaultValue={session?.user?.email || ''} disabled className="text-sm" />
                </div>
                <div>
                  <Label htmlFor="bio" className="text-sm">Bio</Label>
                  <textarea 
                    id="bio"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm"
                    rows={3}
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : saved ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saved ? 'Saved' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 sm:space-y-6">
          <Card className="liquid-glass">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Email Notifications</CardTitle>
              <CardDescription className="text-sm">Choose what emails you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-medium">Task Reminders</p>
                  <p className="text-xs sm:text-sm text-gray-500">Get notified about upcoming tasks</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-medium">Weekly Summary</p>
                  <p className="text-xs sm:text-sm text-gray-500">Receive a weekly summary of your activity</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">AI Suggestions</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Get AI-powered suggestions and insights</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">Product Updates</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Stay informed about new features</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card className="liquid-glass">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">In-App Notifications</CardTitle>
              <CardDescription className="text-sm">Control notifications within the app</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">Desktop Notifications</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Show desktop notifications for important events</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">Sound Alerts</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Play sounds for notifications</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 sm:space-y-6">
          <Card className="liquid-glass">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Password</CardTitle>
              <CardDescription className="text-sm">Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="currentPassword" className="text-sm">Current Password</Label>
                <Input id="currentPassword" type="password" className="text-sm" />
              </div>
              <div>
                <Label htmlFor="newPassword" className="text-sm">New Password</Label>
                <Input id="newPassword" type="password" className="text-sm" />
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-sm">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" className="text-sm" />
              </div>
              <Button className="w-full sm:w-auto">Update Password</Button>
            </CardContent>
          </Card>

          <Card className="liquid-glass">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Two-Factor Authentication</CardTitle>
              <CardDescription className="text-sm">Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">Enable 2FA</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Require a verification code in addition to your password</p>
                </div>
                <Button variant="outline" className="w-full sm:w-auto">Set Up</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="liquid-glass border-red-200 dark:border-red-800">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-red-600 dark:text-red-400">Danger Zone</CardTitle>
              <CardDescription className="text-sm">Irreversible actions that affect your account</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">Sign Out Everywhere</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Sign out of all other active sessions</p>
                </div>
                <Button variant="outline" className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full sm:w-auto text-sm">
                  <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                  Sign Out All
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">Delete Account</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Permanently delete your account and all data</p>
                </div>
                <Button variant="outline" className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full sm:w-auto text-sm">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4 sm:space-y-6">
          <Card className="liquid-glass">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Current Plan</CardTitle>
              <CardDescription className="text-sm">Manage your subscription and billing details</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white">Pro Plan</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">$50/month • Next billing date: Jan 1, 2025</p>
                </div>
                <Button variant="outline" className="w-full sm:w-auto">Manage Plan</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4 sm:space-y-6">
          <Card className="liquid-glass">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Connected Accounts</CardTitle>
              <CardDescription className="text-sm">Manage your connected integrations and services</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">Google Workspace</p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Connected • Last synced 2 hours ago</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">Disconnect</Button>
                </div>
                <Button variant="outline" className="w-full">
                  <Link2 className="h-4 w-4 mr-2" />
                  View All Integrations
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4 sm:space-y-6">
          <Card className="liquid-glass">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Appearance</CardTitle>
              <CardDescription className="text-sm">Customize how Aurelius looks</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              <div>
                <Label className="text-sm">Theme</Label>
                <Select value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark')}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Timezone</Label>
                <Select defaultValue="utc">
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">Eastern Time</SelectItem>
                    <SelectItem value="pst">Pacific Time</SelectItem>
                    <SelectItem value="cst">Central Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}