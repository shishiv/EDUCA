"use client";

import Image from "next/image";
import { GraduationCap, School } from "lucide-react";
import { useMunicipalSettings } from "@/hooks/use-municipal-settings";

interface MunicipalLogoProps {
	size?: "sm" | "md" | "lg" | "xl";
	priority?: boolean;
	className?: string;
}

const sizeMap = {
	sm: { width: 24, height: 24, icon: 16 },
	md: { width: 48, height: 48, icon: 24 },
	lg: { width: 64, height: 64, icon: 32 },
	xl: { width: 96, height: 96, icon: 48 },
};

export function MunicipalLogo({
	size = "md",
	priority = false,
	className = "",
}: MunicipalLogoProps) {
	const dimensions = sizeMap[size];

	return (
		<div className={`flex items-center justify-center ${className}`}>
			<GraduationCap
				className="text-municipal-primary"
				style={{ width: dimensions.icon, height: dimensions.icon }}
			/>
		</div>
	);
}

export function MunicipalBrasao({
	size = "md",
	className = "",
}: Omit<MunicipalLogoProps, "priority">) {
	const dimensions = sizeMap[size];

	return (
		<div className={`flex items-center justify-center ${className}`}>
			<School
				className="text-municipal-primary"
				style={{ width: dimensions.icon, height: dimensions.icon }}
			/>
		</div>
	);
}

export function MunicipalHeaderIdentity({
	className = "",
	variant = "default",
}: {
  className?: string;
  variant?: "default" | "full";
}) {
	const settings = useMunicipalSettings();
	if (!settings) return null;

	return (
		<div className={`flex items-center space-x-3 ${className}`}>
			<MunicipalBrasao size="md" />
			<div className="flex flex-col">
				<span className="text-sm font-bold text-municipal-primary">
					{variant === "full"
						? settings.municipality_name
						: settings.education_department_name}
				</span>
				<span className="text-xs text-municipal-gray-600">
					{settings.education_department_name}
				</span>
			</div>
		</div>
	);
}
