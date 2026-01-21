import { createElement, useEffect } from 'my-react';
import { useNavigate } from 'my-react-router';

export function StatisticsPage() {
	const navigate = useNavigate();
	// navigate('/statistics/general');
	useEffect(() => {
		navigate('/statistics/general');
	}, [navigate]);
	return null;
}
