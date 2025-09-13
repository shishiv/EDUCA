
import React from 'react';
import { Users, School, Calendar, TrendingUp, UserCheck, BookOpen, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/Layout/MainLayout';

const Dashboard = () => {
  const stats = [
    {
      title: 'Total de Alunos',
      value: '1.247',
      change: '+23 este mês',
      icon: Users,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'Escolas/Creches',
      value: '12',
      change: 'Todas ativas',
      icon: School,
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Presença Média',
      value: '94.2%',
      change: '+2.1% este mês',
      icon: UserCheck,
      color: 'text-emerald-600 bg-emerald-100',
    },
    {
      title: 'Turmas Ativas',
      value: '68',
      change: 'Ano letivo 2024',
      icon: BookOpen,
      color: 'text-purple-600 bg-purple-100',
    },
  ];

  const recentActivities = [
    {
      type: 'presence',
      message: 'Presença lançada para Turma 3º A - Escola Municipal João Santos',
      time: 'Há 5 minutos',
      user: 'Prof. Maria Silva'
    },
    {
      type: 'student',
      message: 'Novo aluno cadastrado: João Pedro Oliveira',
      time: 'Há 15 minutos',
      user: 'Secretaria Central'
    },
    {
      type: 'diary',
      message: 'Diário atualizado - Turma 2º B - Creche Municipal Santa Clara',
      time: 'Há 1 hora',
      user: 'Prof. Ana Costa'
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Bem-vindo ao sistema de gestão educacional</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Relatório Mensal</span>
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Exportar Dados</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <span>Ações Rápidas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-12">
                <Users className="w-4 h-4 mr-3" />
                Cadastrar Novo Aluno
              </Button>
              <Button variant="outline" className="w-full justify-start h-12">
                <UserCheck className="w-4 h-4 mr-3" />
                Lançar Presença
              </Button>
              <Button variant="outline" className="w-full justify-start h-12">
                <BookOpen className="w-4 h-4 mr-3" />
                Atualizar Diário
              </Button>
              <Button variant="outline" className="w-full justify-start h-12">
                <School className="w-4 h-4 mr-3" />
                Gerenciar Escolas
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Atividades Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time} • {activity.user}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-blue-600 hover:text-blue-800">
                Ver todas as atividades
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Schools Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo por Escola</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Escola Municipal João Santos', students: 234, presence: '96.5%' },
                { name: 'Creche Municipal Santa Clara', students: 145, presence: '94.2%' },
                { name: 'Escola Municipal Maria José', students: 198, presence: '93.8%' },
                { name: 'Creche Municipal Pequenos Passos', students: 167, presence: '95.1%' },
                { name: 'Escola Municipal São Pedro', students: 203, presence: '97.3%' },
                { name: 'Centro de Educação Infantil Alegria', students: 189, presence: '92.4%' },
              ].map((school, index) => (
                <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-medium text-gray-900 text-sm mb-2">{school.name}</h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{school.students} alunos</span>
                    <span className="text-green-600 font-medium">{school.presence}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
