import { createElement, FragmentComponent, useEffect } from 'my-react';
import { useParams } from 'my-react-router';

export function StatisticsPageSlug() {
	const params = useParams();

	useEffect(() => {
		console.log('Statistics Page Params :', params);
	}, [params]);

	return <div>coucou {params.statsId}</div>;
}
